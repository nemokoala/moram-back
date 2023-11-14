const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn, isAdmin } = require("../config/middleware");
const { unsubscribe } = require("./admin");
const { deleteImageFromS3 } = require("../config/aws");

//1.회원 관리 기능
//1.1 전체 회원 조회
router.get("/allusers", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const allUserSql =
      //hitDate (최근 로그인 시간, 계정상태..휴먼 , 탈퇴 게정인지) 추가
      "SELECT * FROM users";
    const [allUser] = await db.query(allUserSql);
    res.status(200).json({ content: allUser });
  } catch (error) {
    res.status(500).json({ message: "서버 오류" });
    console.error(error);
  }
});

//1.2 회원 삭제 기능
router.delete("/user/:id", isLoggedIn, isAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const userSql = "SELECT * FROM users WHERE id =? ";
    const [users] = await db.query(userSql, userId);
    if (users.length === 0) {
      return res
        .status(400)
        .json({ message: "해당하는 유저가 존재하지 않습니다. " });
    }

    const deleteSql = "DELETE FROM users WHERE id =?";
    const [results] = await db.query(deleteSql, userId);
    res.status(200).json({ message: "해당 유저가 삭제되었습니다. " });
  } catch (error) {
    res.status(500).json({ message: "서버에러 " });
    console.error(error);
  }
});

//2. 게시글 관리 기능
//2.1 게시글 전체 조회
router.get("/allposts", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const allPostSql = "SELECT * FROM postings";
    const [results] = await db.query(allPostSql);
    res.status(200).json({ content: results });
  } catch (error) {
    res.status(500).json({ message: "서버 에러 " });
    console.error(error);
  }
});

//2.2 게시글 삭제하기
router.delete("/posting/:id", isLoggedIn, isAdmin, async (req, res) => {
  const postId = Number(req.params.id);
  try {
    //해당 게시글이 존재하는지
    const postSql = "SELECT * FROM postings WHERE id = ?";
    const [posts] = await db.query(postSql, postId);
    if (posts.length === 0) {
      res
        .status(400)
        .json({ message: " 해당하는 게시글이 존재하지 않습니다. " });
      return;
    }

    //게시글 삭제하기
    const deleteSql = "DELETE FROM postings WHERE id = ? ";
    const [results] = await db.query(deleteSql, postId);

    //aws 이미지 삭제
    if (posts[0].img1Url)
      await deleteImageFromS3("moram", posts[0].img1Url.split(".com/")[1]);
    if (posts[0].img2Url)
      await deleteImageFromS3("moram", posts[0].img2Url.split(".com/")[1]);
    if (posts[0].img3Url)
      await deleteImageFromS3("moram", posts[0].img3Url.split(".com/")[1]);

    res.status(200).json({ message: "해당 게시글이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "서버 오류입니다. " });
    console.error(error);
  }
});

//3. 신고 관리 기능
//3.1 전체 신고 목록 조회하기
router.get("/report", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const reportSql = "SELECT id, nickname, description FROM reports ";
    const [results] = await db.query(reportSql);
    res.status(200).json({ content: results });
  } catch (error) {
    res.status(500).json({ message: "서버 에러 " });
    console.error(error);
  }
});

//3.2 특정 신고 목록 조회하기
router.get("/report/:id", isLoggedIn, isAdmin, async (req, res) => {
  const reportId = req.params.id;
  try {
    const reportSql = "SELECT * FROM reports WHERE id = ?";
    const [results] = await db.query(reportSql, reportId);

    if (results.length === 0) {
      return res
        .status(400)
        .json({ message: "해당하는 게시물을 신고글을 찾을 수 없습니다. " });
    }
    res.status(200).json({ content: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버에러 " });
  }
});

//4. 댓글 관리 기능
//4.1 전체 댓글 조회하기
router.get("/allcomments", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const allcommetSql = "SELECT * FROM comments";
    const [results] = await db.query(allcommetSql);
    res.status(200).json({ content: results });
  } catch (error) {
    res.status(500).json({ message: "댓글 서버 에러 " });
    console.error(error);
  }
});

//4.2 댓글 삭제 하기
router.delete("/comment/:id", isLoggedIn, isAdmin, async (req, res) => {
  const commentId = Number(req.params.id);
  try {
    const commentSql = "SELECT * FROM comments WHERE id=? ";
    const [comments] = await db.query(commentSql, commentId);

    if (comments.length === 0) {
      return res
        .status(400)
        .json({ message: "해당하는 댓글이 존재하지 않습니다." });
    }

    const postId = comments[0].postId;
    // 댓글 수 삭제
    const addCountSql =
      "UPDATE postings SET commentCount = commentCount - 1 WHERE id = ?";
    await db.query(addCountSql, postId);

    const deleteSql = "DELETE FROM comments WHERE id =? ";
    const [results] = await db.query(deleteSql, commentId);
    res.status(200).json({ message: "댓글이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "댓글 삭제 서버 에러" });
  }
});

module.exports = router;
