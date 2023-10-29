const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn } = require("../config/middleware");

const isAdmin = (req, res, next) => {
  //요청한 사용자가 존재하고 그 역할이 admin일 경우
  if (req.user && req.user[0].role === "admin") {
    next();
  } else {
    res.status(403).send("관리자 권한이 필요합니다. ");
  }
};

router.get("/", isLoggedIn, isAdmin, async (req, res) => {
  //전체 회원정보 불러오기
  try {
    const allUserSql =
      //hitDate (최근 접속 날짜) 추가
      "SELECT nickname, role, email, reqDate, gptCount FROM users";
    const [allUser] = await db.query(allUserSql);
    res.json(allUser);
  } catch (error) {
    res.status(500).send(err);
  }
});

module.exports = router;
