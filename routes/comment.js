const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn } = require("../config/middleware");
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// router.get("/test", (req, res) => {
//   // res.send("test");
//   // console.log(req.session.passport);
//   res.json(req.query.t);
// });

//해당 게시물의 모든 댓글 내용 불러오기
router.get("/:postId", async (req, res) => {
  const postId = req.params.postId;
  try {
    const allSql = "SELECT * FROM comments WHERE postId = ?";
    const [results] = await db.query(allSql, [postId]);
    res.status(200).json({ content: results });
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
    console.error(error);
  }
});

// 댓글 추가하기
router.post("/:postId", isLoggedIn, async (req, res) => {
  try {
    const writeTime = new Date();
    const content = req.body.content;
    const postId = Number(req.params.postId); //해당 댓글의 포스팅 id
    const parentId = Number(req.query.parentId) || null; //대댓글 시 부모 댓글 id
    const userId = Number(req.session.passport.user[0].id);
    const userNickname = req.session.passport.user[0].nickname;

    // 댓글 수 삽입
    const addCountSql =
      "UPDATE postings SET commentCount = commentCount + 1 WHERE id = ?";
    await db.query(addCountSql, postId);

    //댓글 추가
    const addSql =
      "INSERT INTO comments (userId, postId, nickname, content, writeTime, parentId) VALUES (?, ?, ?, ?, ?, ?)";
    const result = await db.query(addSql, [
      userId,
      postId,
      userNickname,
      content,
      writeTime,
      parentId,
    ]);

    const insertNotificationSql = "INSERT INTO notifications SET ?";
    // 댓글 작성이 성공적으로 이루어진 후 알림 전송
    if (result) {
      // 게시물 작성자에게 알림 전송
      const postSql = "SELECT userId FROM postings WHERE id = ?";
      const [postResults] = await db.query(postSql, [postId]);

      if (postResults.length === 0) {
        return res.status(400).json({ message: "게시물을 찾을 수 없습니다." });
      }

      const postUserId = postResults[0].userId;
      // 대댓글 작성시 부모 댓글 작성자에게 알림 전송
      if (parentId) {
        const parentCommentSql =
          "SELECT userId, postId FROM comments WHERE id = ?";
        const [parentCommentResults] = await db.query(parentCommentSql, [
          parentId,
        ]);

        if (parentCommentResults.length > 0) {
          const parentCommentUserId = parentCommentResults[0].userId;
          const parentPostId = parentCommentResults[0].postId;

          // 만약 부모 댓글의 작성자가 대댓글을 작성한 사용자와 같지 않다면 알림을 생성
          if (parentCommentUserId !== req.session.passport.user[0].id) {
            const replyNotification = {
              notifyType: 1, // 대상 타입은 1으로 설정 (댓글)
              targetId: parentId, // 부모 댓글 ID
              targetUserId: parentCommentUserId, // 부모 댓글 작성자의 ID
              postId: parentPostId, // 대댓글의 게시물 ID
              notifyTime: new Date(), // 알림 생성 시간
              readType: 0, // 알림 읽음 여부 (0: 읽지 않음, 1: 읽음)
            };
            const [insertResult] = await db.query(
              insertNotificationSql,
              replyNotification
            );
          }
        }
      } else if (postUserId !== req.session.passport.user[0].id) {
        const commentNotification = {
          notifyType: 0, // 대상 타입은 0으로 설정 (게시물)
          targetId: postId, // 게시물 ID
          targetUserId: postUserId, // 게시물 작성자의 ID
          postId: postId, // 댓글의 게시물 ID
          notifyTime: new Date(), // 알림 생성 시간
          readType: 0, // 알림 읽음 여부 (0: 읽지 않음, 1: 읽음)
        };

        await db.query(insertNotificationSql, commentNotification);
      }
    }

    return res.status(200).json({
      message: "댓글이 성공적으로 작성되었습니다.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "댓글 추가 서버에러" });
  }
});


// 댓글추가 : http://localhost:8000/comment/123
//대댓글 추가 : http://localhost:8000/comment/123?parentId=456

router.delete("/:id", isLoggedIn, async (req, res) => {
  // 댓글 삭제 기능
  const id = req.params.id; //URl에서 추출된 매개변수 값
  const userId = req.session.passport.user[0].id;

  try {
    const commentSql = "SELECT * FROM comments WHERE id = ?";
    const [comments] = await db.query(commentSql, id);

    //삭제하려는 댓글 레코드
    if (comments.length === 0) {
      res
        .status(400)
        .json({ message: "해당하는 댓글이 더 이상 존재하지 않습니다." });
      return;
    }

    const postId = comments[0].postId;
    const commentUserId = comments[0].userId;

    // 댓글 작성자 id vs 삭제요청 유저 id 비교 후 권한 부여
    if (userId === commentUserId) {
      const addCountSql =
        "UPDATE postings SET commentCount = commentCount - 1 WHERE id = ?";
      await db.query(addCountSql, postId);

      //댓글 삭제
      const deleteSql = "DELETE FROM comments WHERE id = ?";
      const [results] = await db.query(deleteSql, id);
      res.status(200).json({ message: "댓글이 삭제되었습니다." });
    } else {
      res
        .status(403)
        .json({ message: "댓글을 삭제할 권한이 존재하지 않습니다." });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "댓글 삭제 서버 에러" });
    console.error(error);
  }
});

module.exports = router;
