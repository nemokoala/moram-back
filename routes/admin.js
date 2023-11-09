const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn, isAdmin } = require("../config/middleware");

//회원관리기능
router.get("/allusers", isLoggedIn, isAdmin, async (req, res) => {
  //전체 회원정보 불러오기
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

//게시글 관리 기능
//게시글 전체 조회
router.get("/allposts", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const allPostSql =
      "SELECT id, nickname, title, writeTime, tag, category FROM postings";
    const [results] = await db.query(allPostSql);
    res.status(200).json({ content: results });
  } catch (error) {
    res.status(500).json({ message: "서버 에러 " });
    console.error(error);
  }
});

//특정 게시글 조회
router.get("/allposts/:id", isLoggedIn, isAdmin, async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const postSql = "SELECT * FROM postings WHERE id = ?";
    const [results] = await db.query(postSql, postId);
    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "해당 게시글을 찾을 수 없습니다. " });
    }
    res.json({ content: results[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다. " });
  }
});

//게시글 삭제하기
router.delete("/allposts/:id", isLoggedIn, isAdmin, async (req, res) => {
  const postId = Number(req.params.id);
  try {
    //해당 게시글이 존재하는지
    const postSql = "SELECT * FROM postings WHERE id = ?";
    const [posts] = await db.query(postSql, postId);
    if (posts.length === 0) {
      res
        .status(404)
        .json({ message: " 해당하는 게시글이 존재하지 않습니다. " });
      return;
    }

    //게시글 삭제하기
    const deleteSql = "DELETE FROM postings WHERE id = ? ";
    const [results] = await db.query(deleteSql, postId);
    res.status(200).json({ message: "해당 게시글이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "서버 오류입니다. " });
    console.error(error);
  }
});

//신고 기능
//신고 목록 조회하기
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
//특정 신고 목록 조회하기
router.get("/report/:id", isLoggedIn, isAdmin, async (req, res) => {
  const reportId = req.params.id;
  try {
    const reportSql = "SELECT * FROM reports WHERE id = ?";
    const [results] = await db.query(reportSql, reportId);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "해당하는 게시물을 신고글을 찾을 수 없습니다. " });
    }
    res.status(200).json({ content: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버에러 " });
  }
});

module.exports = router;
