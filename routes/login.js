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
const { returnUser } = require("../config/middleware");
router.use(express.urlencoded({ extended: true }));
router.use(express.json());
// router.get("/", (req, res) => {
//   res.render("login");
// });

if (process.env.IS_PUBLISHED === "TRUE") {
  var URL = process.env.PUBLISH_URL;
  var API_URL = process.env.PUBLISH_API_URL;
} else {
  var URL = "http://localhost:3000";
  var API_URL = "http://localhost:8000";
}

router.post("/", isNotLoggedIn, async (req, res, next) => {
  //? local로 실행이 되면 localstrategy.js를 찾아 실행한다.
  passport.authenticate("local", (authError, user, info) => {
    //? (authError, user, info) => 이 콜백 미들웨어는 localstrategy에서 done()이 호출되면 실행된다.
    //? localstrategy에 done()함수에 로직 처리에 따라 1,2,3번째 인자에 넣는 순서가 달랐는데 그 이유가 바로 이것이다.

    // done(err)가 처리된 경우
    if (authError) {
      console.error(authError);
      return next(authError); // 에러처리 미들웨어로 보낸다.
    }
    // done(null, false, { message: '비밀번호가 일치하지 않습니다.' }) 가 처리된 경우
    if (!user) {
      // done()의 3번째 인자 { message: '비밀번호가 일치하지 않습니다.' }가 실행
      console.log("hi.");
      console.log(info);
      return res.status(401).json(info);
    }

    //? done(null, exUser)가 처리된경우, 즉 로그인이 성공(user가 false가 아닌 경우), passport/index.js로 가서 실행시킨다.
    return req.login(user, (loginError) => {
      //? loginError => 미들웨어는 passport/index.js의 passport.deserializeUser((id, done) => 가 done()이 되면 실행하게 된다.
      // 만일 done(err) 가 됬다면,
      if (loginError) {
        console.error(loginError);
        return next(loginError);
      }
      // done(null, user)로 로직이 성공적이라면, 세션에 사용자 정보를 저장해놔서 로그인 상태가 된다.
      //자동로그인
      console.log(req.body);
      if (req.body.remember) {
        req.session.cookie.expires = 1000 * 60 * 60 * 24 * 7; //쿠키 유효기간 7일
      } else {
        req.session.cookie.maxAge = false;
      }
      return res.status(200).json({
        code: 200,
        success: true,
        message: "로그인 성공",
        content: returnUser(user[0]),
      });
    });
  })(req, res, next); //! 미들웨어 내의 미들웨어에는 콜백을 실행시키기위해 (req, res, next)를 붙인다.
});

// router.get("/forgotpw", (req, res) => {
//   res.json("forgot");
// });

//비밀번호 찾기 API
router.post("/forgotpw", isNotLoggedIn, async (req, res) => {
  try {
    const { email } = req.body;

    //이메일 유효성 검사
    if (!validateEmail(email)) {
      return res
        .status(400)
        .json({ message: "이메일 형식이 올바르지 않습니다." });
    }

    const sql = `SELECT * FROM users WHERE email = ?`;
    const result = await db.query(sql, email);
    const user = result[0];
    if (user.length === 0) {
      return res.status(400).json({ message: "존재하지 않는 이메일입니다." });
    }
    const newpassword = await generatePassword();
    const hashedPassword = await bcrypt.hash(newpassword, 12);
    const token = crypto.randomBytes(20).toString("hex");
    const ttl = new Date(Date.now() + 5 * 60 * 1000);
    const mail = user[0].email;
    const insertSql = `INSERT INTO pwdVerification (token, email, pwd, expiresAt) VALUES (?, ?, ?, ?)`;
    await db.query(insertSql, [token, mail, hashedPassword, ttl]);
    console.log(user);
    let transporter = smtpTransport;
    let mailOptions = {
      from: process.env.EMAIL, //송신할 이메일
      to: mail, //수신할 이메일
      subject: "[모람모람]아이디/비밀번호 정보입니다.",
      html: ` <div>
      <p>요청한 계정 정보는 아래와 같습니다.</p>
      <hr />
      <ul>
        <li>사이트 : <a href="https://www.moram2.com">https://www.moram2.com</a></li>
        <li>이메일 : ${user[0].email}</li>
        <li>닉네임 : ${user[0].nickname}</li>
        <li>비밀번호 :${newpassword}</li>
      </ul>
      <span>아래 링크를 클릭하면 위에 적힌 비밀번호로 변경됩니다.</span>
      <p>로그인 후 다른 비밀번호로 변경해 주시기 바랍니다.</p>
      <p>링크를 클릭하지 않으면 비밀번호가 변경되지 않습니다.</p>
      <a
        href="${API_URL}/login/reset/${token}"
        rel="noreferrer noopener"
        target="_blank"
        >http://${API_URL}/login/reset/${token}</a
      >
    </div>`,
    };
    console.log(mailOptions);
    await transporter.sendMail(mailOptions);
    console.log("메일 발송 성공");

    res.status(200).json({ message: "메일 발송 성공" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "서버에러" });
  }
});

router.get("/reset/:token", async (req, res) => {
  const { token } = req.params;
  try {
    function returnUser(user) {
      const userData = {
        id: user.id,
        nickname: user.nickname,
        platformType: user.platformType,
        email: user.email,
        gptCount: user.gptCount,
        role: user.role,
      };
      return userData;
    }
    const sql = `SELECT * FROM pwdVerification WHERE token = ? AND expiresAt > NOW()`;
    const [result] = await db.query(sql, [token]);
    const newPassword = result[0].pwd;
    console.log(`newpassword:${newPassword}`);
    const updateSql = `UPDATE users SET password = ? WHERE email = ?`;
    const [updateResult] = await db.query(updateSql, [
      newPassword,
      result[0].email,
    ]);
    console.log(updateResult);
    const deleteSql = `DELETE FROM pwdVerification WHERE token = ?`;
    await db.query(deleteSql, [token]);
    res.status(200).send("비밀번호가 변경되었습니다.");
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "인증만료" });
  }
});

module.exports = router;
