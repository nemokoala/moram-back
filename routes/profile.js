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

const {
  validateEmail,
  validatePassword,
  validateNickname,
} = require("../config/validation");

const imglist = [
  "green",
  "pink",
  "yellowgreen",
  "yellow",
  "black",
  "white",
  "blue",
  "skyblue",
  "lightpurple",
];
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

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
    const nicknamesql = "SELECT * FROM users WHERE nickname = ?";
    const [nicknameResult] = await db.query(nicknamesql, [nickname]);
    if (nicknameResult.length > 0) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "이미 존재하는 닉네임입니다.",
      });
    }
    const sql = `UPDATE users SET nickname = ? WHERE email = ?`;
    const [result] = await db.query(sql, [nickname, req.user[0].email]);
    console.log(result);
    req.user[0].nickname = nickname;
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
    const [user] = await db.query(sql, [req.user[0].email]);
    if (bcrypt.compareSync(prepw, user[0].password) === false) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "현재 비밀번호가 일치하지않습니다.",
      });
    }

    const hash = await bcrypt.hash(pw1, 12);
    const updateSql = `UPDATE users SET password = ? WHERE email = ?`;
    const [updateResult] = await db.query(updateSql, [hash, req.user[0].email]);
    console.log(updateResult);
    res.status(200).json({
      code: 200,
      success: true,
      message: "비밀번호가 변경되었습니다.",
    });
  } catch (err) {
    console.log(err);
    console.log("이쪽으로갔나?");
    res.status(500).json({ message: "서버에러" });
  }
});
// 프로필 이미지 변경 api
router.post("/changeimg", async (req, res) => {
  try {
    const { img } = req.body;
    if (!img || imglist.includes(img) === false || img.length > 20) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "유효한 형식의 이미지가 아닙니다.",
      });
    }

    const sql = `UPDATE users SET img = ? WHERE email = ?`;
    const [result] = await db.query(sql, [img, req.user[0].email]);
    console.log(result);
    res.status(200).json({
      code: 200,
      success: true,
      message: "프로필 이미지가 변경되었습니다.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "프로필 이미지 설정 서버 에러" });
  }
});

router.post("/test", async (req, res) => {
  res.status(200).json({ message: "test" });
});
module.exports = router;
