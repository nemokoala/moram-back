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
      "SELECT id, nickname, role, email, reqDate, gptCount FROM users";
    const [allUser] = await db.query(allUserSql);
    res.json(allUser);
  } catch (error) {
    res.status(500).send(error);
  }
});

//공지기능
//1. 전체 공지 보기
router.get("/notices", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const allSql = "SELECT id, title, updateTime FORM notices";
    const [results] = await db.query(allSql);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "db에러" });
    console.error(error);
  }
});

//2. 공지 자세히 보기
router.get("/notices/:id", isLoggedIn, isAdmin, async (req, res) => {
  const noticesId = req.params.id;
  try {
    const getSql = "SELECT * FROM notices WHERE id = ?";
    const [results] = await db.query(getSql, [noticesId]);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

//3. 관리자가 공지 추가하기
router.post("/notices", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const writeTime = new Date();
    const updateTime = new Date();
    const { title, content } = req.body;
    const adminId = Number(req.user[0].id);
    const adminNickname = req.user[0].nickname;

    const addSql =
      "INSERT INTO notices (userId, title, content, writeTime, updateTime, nickname) VALUES (?, ?, ?, ?, ?, ?)";
    const [results] = await db.query(addSql, [
      adminId,
      title,
      content,
      writeTime,
      updateTime,
      adminNickname,
    ]);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "공지 추가 서버에러 " });
  }
});

//4. 관리자 공지 삭제 기능
router.delete("/notices/:id", isLoggedIn, isAdmin, async (req, res) => {
  const noticesId = Number(req.params.id);
  try {
    const deleteSql = "DELETE FROM notices WHERE id=? ";
    const [results] = await db.query(deleteSql, [noticesId]);

    if (results.length === 0) {
      res.status(404).send("해당하는 공지글이 더 이상 존재하지 않습니다.");
      return;
    }
    res.status(200).send("공지글이 삭제되었습니다.");
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
    console.error(error);
  }
});

module.exports = router;
