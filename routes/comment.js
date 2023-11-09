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

    // 댓글 수 가져오기
    const commmentCountSql = "SELECT commentCount FROM postings WHERE id =? ";
    const [[commentCount]] = await db.query(commmentCountSql, postId);
    const count = commentCount.commentCount + 1;

    // 댓글 수 삽입
    const addCountSql = "UPDATE postings SET commentCount = ? WHERE id = ?";
    await db.query(addCountSql, [count, postId]);

    //댓글 추가
    const addSql =
      "INSERT INTO comments ( userId, postId, nickname, content, writeTime, parentId) VALUES (?, ?, ?, ?, ?, ?)";
    await db.query(addSql, [
      userId,
      postId,
      userNickname,
      content,
      writeTime,
      parentId,
    ]);

    res.status(200).json({
      message: "댓글이 성공적으로 작성되었습니다.",
      comment: {
        userNickname,
        content,
        writeTime,
      },
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
        .status(404)
        .json({ message: "해당하는 댓글이 더 이상 존재하지 않습니다." });
      return;
    }

    const postId = comments[0].postId;
    const commentUserId = comments[0].userId;

    // 댓글 작성자 id vs 삭제요청 유저 id 비교 후 권한 부여
    if (userId === commentUserId) {
      // 댓글 수 가져오기
      const commmentCountSql = "SELECT commentCount FROM postings WHERE id =? ";
      const [[commentCount]] = await db.query(commmentCountSql, postId);
      const count = commentCount.commentCount - 1;

      // 댓글 수 삽입
      const addCountSql = "UPDATE postings SET commentCount = ? WHERE id = ?";
      await db.query(addCountSql, [count, postId]);

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
