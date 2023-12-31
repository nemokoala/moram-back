const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const session = require("express-session");
const ejs = require("ejs");
const axios = require("axios");
const passport = require("../config/passport");
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
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

// router.get("/", (req, res) => {
//   res.render("register");
// });

//회원가입페이지
router.post("/", isNotLoggedIn, async (req, res) => {
  console.log(req.body);
  const { nickname, email, password } = req.body;
  console.log("잘받아졌나?");
  console.log(nickname);

  console.log("회원가입절차시작");
  console.log(email, password);
  console.log("--------------------");

  try {
    if (!req.session.email) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "이메일 인증을 해주세요.",
      });
    }
    console.log("1. 이메일 인증완료");

    if (!validateNickname(nickname)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "유효한 형식의 닉네임이 아닙니다.",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "유효한 형식의 이메일이 아닙니다.",
      });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message:
          "비밀번호는 8자 이상, 영문자, 숫자, 특수문자를 포함해야 합니다.",
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
    console.log("2. 유효성 검사 완료");
    if (email !== req.session.email) {
      console.log(`인증정보 불일치`);
      console.log(email, req.session.email, nickname, req.session.nickname);
      console.log("-------------");
      return res.status(400).json({
        code: 400,
        success: false,
        message: "인증정보 불일치",
      });
    }
    console.log("회원가입중");

    const sql = `INSERT IGNORE INTO users (platformType, nickname, email, password) VALUES (?, ?, ?, ?)`;
    hash = await bcrypt.hash(password, 12);
    await db.query(sql, ["local", nickname, email, hash]);
    res.status(200).json("회원가입 성공");
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: `${err}` });
  }
});

// router.post("/validatenickname", isNotLoggedIn, async (req, res, next) => {
//   try {
//     const { nickname } = req.body;
//     const sql = "SELECT * FROM users WHERE nickname = ?";
//     const [user] = await db.query(sql, [nickname]);
//     if (user.length > 0) {
//       return res.status(400).json({
//         code: 400,
//         success: false,
//         message: "이미 존재하는 닉네임입니다.",
//       });
//     }
//     req.session.nickname = nickname;
//     res.status(200).json({
//       code: 200,
//       success: true,
//       message: "닉네임 인증 성공",
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ message: "서버에러" });
//   }
// });

router.post("/mailsend", async (req, res, next) => {
  console.log("mailsend post 요청");
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      return res
        .status(403)
        .json({ message: "유효한 형식의 이메일이 아닙니다." });
    }

    const usersql = "SELECT * FROM users WHERE email = ?";
    const [users] = await db.query(usersql, [email]);
    if (users.length > 0) {
      return res.status(400).json({ message: "이메일이 이미 존재합니다." });
    }

    const deletesql = "DELETE FROM emailVerification WHERE email = ?";
    await db.query(deletesql, [email]);

    //랜덤 인증 코드 생성
    const authcode = Math.floor(100000 + Math.random() * 900000).toString();
    let transporter = smtpTransport;
    //메일 설정

    const searchSql = `SELECT * FROM users WHERE email = ?`;
    const [user] = await db.query(searchSql, [email]);

    if (user.length > 0) {
      return res.status(403).json({ message: "이미 존재하는 이메일입니다." });
    }
    res.status(200).json({ message: "메일 발신 성공" });
    let mailOptions = {
      from: process.env.EMAIL, //송신할 이메일
      to: email, //수신할 이메일
      subject: "[모람모람]인증 관련 이메일 입니다",
      text: `오른쪽 숫자 6자리를 입력해주세요 : ${authcode}`,
    };
    await transporter.sendMail(mailOptions);
    console.log("응답 후 메일 발송 성공");

    //db에 인증 정보 저장 (이메일, 인증코드, 만료시간)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const sql = `INSERT INTO emailVerification (email, authcode, expiresAt) VALUES (?, ?, ?)`;
    db.query(sql, [email, authcode, expiresAt]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버에러" });
    next(err);
  }
});

router.post("/mailverify", async (req, res, next) => {
  try {
    const { email, authcode } = req.body;
    console.log(email);
    console.log(authcode);
    const sql = `SELECT * FROM emailVerification WHERE email = ? AND authcode = ? AND expiresAt > NOW()`;
    const [result] = await db.query(sql, [email, authcode]);
    console.log(result);
    if (result.length === 0) {
      return res.status(400).json({ message: "인증코드가 일치하지 않습니다." });
    }
    //만약 인증코드가 일치하다면, 세션에 이메일 저장
    req.session.email = email;
    res.status(200).json({ message: "인증코드가 일치합니다." });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "서버에러" });
  }
});

module.exports = router;
