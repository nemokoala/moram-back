const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const session = require("express-session");
const ejs = require("ejs");
const axios = require("axios");
const passport = require("../config/passport");
const fs = require("fs");
const smtpTransport = require("../config/email");
const {
  generatePassword,
  isLoggedIn,
  isNotLoggedIn,
} = require("../config/middleware");
const { type } = require("os");
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};
// password 유효성 검사 함수, 형식에 맞으면 true 리턴 틀리면 false 리턴
const validatePassword = (password) => {
  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

//내가 작성한 글 불러오는 api
router.get("/", isLoggedIn, async (req, res) => {
  const userID = req.user[0].id;
  try {
    const postingSql = "SELECT * FROM postings WHERE userId = ?";
    const [postings] = await db.query(postingSql, [userID]);
    const commentSql = "SELECT * FROM comments WHERE userId = ?";
    const [comments] = await db.query(commentSql, [userID]);
    res.status(200).json({
      posting: postings,
      comment: comments,
      email: req.user[0].email,
      nickname: req.user[0].nickname,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({ message: "서버 에러" });
  }
});

router.post("/changenickname", isLoggedIn, async (req, res) => {
  const { nickname } = req.body;

  try {
    if (!validateNickname(nickname)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "유효한 형식의 닉네임이 아닙니다.",
      });
    }
    const sql = `UPDATE users SET nickname = ? WHERE email = ?`;
    const [result] = await db.query(sql, [nickname, req.user[0].email]);
    console.log(result);
    res.status(200).json({
      code: 200,
      success: true,
      message: "닉네임이 변경되었습니다.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "서버에러" });
  }
});

router.post("/changepw", isLoggedIn, async (req, res) => {
  const { prepw, pw1, pw2 } = req.body;

  try {
    if (!validatePassword(pw1)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "유효한 형식의 비밀번호가 아닙니다.",
      });
    }
    if (pw1 !== pw2) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "두 비밀번호가 일치하지 않습니다.",
      });
    }

    const sql = `SELECT * FROM users WHERE email = ?`;
    const [user] = await db.query(sql, [email]);
    if (bcrypt.compareSync(prepw, user[0].password) === false) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "현재 비밀번호가 일치하지않습니다.",
      });
    }

    const hash = await bcrypt.hash(pw1, 12);
    const updateSql = `UPDATE users SET password = ? WHERE email = ?`;
    const [updateResult] = await db.query(updateSql, [hash, email]);
    console.log(updateResult);
    res.status(200).json({
      code: 200,
      success: true,
      message: "비밀번호가 변경되었습니다.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "서버에러" });
  }
});

module.exports = router;
