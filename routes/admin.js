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
      "SELECT id, nickname, role, email, regDate, gptCount FROM users";
    const [allUser] = await db.query(allUserSql);
    res.json(allUser);
  } catch (error) {
    res.status(500).send(error);
    console.error(error);
  }
});

//게시글 관리 기능
//게시글 전체 조회
router.get("/allposts", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const allPostSql =
      "SELECT id, nickname title, writeTime, tag, category FROM postings";
    const [results] = await db.query(allPostSql);
    res.json(results);
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
    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다. " });
  }
});

module.exports = router;
