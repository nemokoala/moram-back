const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn } = require("../config/middleware");

router.get("/", isLoggedIn, async (req, res) => {
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
