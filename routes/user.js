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
const { isloggedin, isnotloggedin } = require("../config/middleware");
const { type } = require("os");
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

const requireLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};
// const validateUserId = (userid) => {
//   const useridRegex = /^[a-zA-Z0-9]{4,10}$/;
//   return useridRegex.test(userid);
// };

const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

router.get("/", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM users");
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.error(error);
  }
});

router.get("/register", (req, res) => {
  res.send("register");
});

router.post("/register", async (req, res) => {
  console.log(req.body);
  const { nickname, email, password } = req.body;

  try {
    const sql = "SELECT * FROM users WHERE nickname = ?";
    const [user] = await db.query(sql, [nickname]);
    if (user.length > 0) {
      return res.status(400).send("닉네임이 이미 존재합니다.");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("서버에러");
  }

  console.log("회원가입중1------");
  console.log(email, password);
  console.log("--------------------");
  if (!req.session.email) {
    return res.status(400).send("이메일 인증을 해주세요.");
  }
  console.log("회원가입중2");
  if (!validateEmail(email)) {
    return res.status(400).send("유효한 형식의 이메일이 아닙니다.");
  }
  if (!validatePassword(password)) {
    return res.status(400).send("유효한 형식의 비밀번호가 아닙니다.");
  }
  console.log("회원가입중");
  try {
    const usersql = "SELECT * FROM users WHERE email = ?";
    const [users] = await db.query(usersql, [email]);
    if (users.length > 0) {
      return res.status(400).send("이메일이 이미 존재합니다.");
    }

    const sql = `INSERT INTO users (platformType, nickname, email, password) VALUES (?, ?, ?, ?)`;
    hash = await bcrypt.hash(password, 12);
    await db.query(sql, ["local", nickname, email, hash]);
    res.status(200).send("회원가입 성공");
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

router.post("/login", (req, res, next) => {
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
      console.log(info.message);
      return res.status(400).send(info.message);
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
      return res.json({ message: "로그인 성공", content: user });
    });
  })(req, res, next); //! 미들웨어 내의 미들웨어에는 콜백을 실행시키기위해 (req, res, next)를 붙인다.
});

router.post("/validatenickname", async (req, res, next) => {
  try {
    const { nickname } = req.body;
    const sql = "SELECT * FROM users WHERE nickname = ?";
    const [user] = await db.query(sql, [nickname]);
    if (user.length > 0) {
      return res.status(400).send("닉네임이 이미 존재합니다.");
    }
    res.status(200).send("사용가능한 닉네임입니다.");
  } catch (err) {
    console.log(err);
    res.status(500).send("서버에러");
  }
});

router.post("/mailsend", async (req, res, next) => {
  console.log("메일 전송");
  console.log(req.body);
  console.log(1);
  try {
    //랜덤 인증 코드 생성
    const authcode = Math.floor(100000 + Math.random() * 900000).toString();
    let transporter = smtpTransport;
    //메일 설정
    const { email } = req.body;
    if (!validateEmail(email)) {
      return res.status(403).send("유효한 형식의 이메일이 아닙니다.");
    }
    const searchSql = `SELECT * FROM users WHERE email = ?`;
    const [user] = await db.query(searchSql, [email]);

    if (user.length > 0) {
      return res.status(403).send("이미 존재하는 이메일입니다.");
    }

    let mailOptions = {
      from: "c1004sos@1gmail.com", //송신할 이메일
      to: email, //수신할 이메일
      subject: "[모람모람]인증 관련 이메일 입니다",
      text: `오른쪽 숫자 6자리를 입력해주세요 : ${authcode}`,
    };
    console.log(mailOptions);
    await transporter.sendMail(mailOptions);
    console.log("메일 발송 성공");

    //db에 인증 정보 저장 (이메일, 인증코드, 만료시간)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const sql = `INSERT INTO emailVerification (email, authcode, expiresAt) VALUES (?, ?, ?)`;
    db.query(sql, [email, authcode, expiresAt]);
    res.status(200).send("메일발신성공");
  } catch (err) {
    console.error(err);
    res.status(500).send("서버에러");
    next(err);
  }
});

router.post("/mailverify", async (req, res, next) => {
  try {
    const { email, authcode } = req.body;
    console.log(authcode);
    const sql = `SELECT * FROM emailVerification WHERE email = ? AND authcode = ? AND expiresAt > NOW()`;
    const [result] = await db.query(sql, [email, authcode]);
    if (result.length === 0) {
      return res.status(400).send("인증코드가 일치하지 않습니다.");
    }
    //만약 인증코드가 일치하다면, 세션에 이메일 저장
    req.session.email = email;
    res.status(200).send("인증코드가 일치합니다.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("서버에러");
  }
});

router.get("/forgot", (req, res) => {
  res.send("forgot");
});

router.post("/forgot", async (req, res) => {
  const { email } = req.body;
  if (email === "") {
    res.status(400).send("이메일을 입력해주세요.");
  }

  try {
    const sql = `SELECT * FROM users WHERE email = ?`;
    const result = await db.query(sql, email);
    const user = result[0];
    if (user.length === 0) {
      return res.status(400).send("존재하지 않는 이메일입니다.");
    }
    const newpassword = await generatePassword();
    const hashedPassword = await bcrypt.hash(newpassword, 12);
    const token = crypto.randomBytes(20).toString("hex");
    const data = {
      token,
      mail: user[0].email,
      ttl: new Date(Date.now() + 5 * 60 * 1000),
    };
    console.log(data);
    const insertSql = `INSERT INTO pwdVerification (token, email, pwd, expiresAt) VALUES (?, ?, ?, ?)`;
    await db.query(insertSql, [
      data.token,
      data.mail,
      hashedPassword,
      data.ttl,
    ]);
    console.log(user);
    let transporter = smtpTransport;
    let mailOptions = {
      from: "c1004sos@1gmail.com", //송신할 이메일
      to: data.mail, //수신할 이메일
      subject: "[모람모람]아이디/비밀번호 정보입니다.",
      html: ` <div>
      <p>요청한 계정 정보는 아래와 같습니다.</p>
      <hr />
      <ul>
        <li>사이트 : https://www.moram.com</li>
        <li>이메일 : ${user[0].email}</li>
        <li>닉네임 : ${user[0].nickname}</li>
        <li>비밀번호 :${newpassword}</li>
      </ul>
      <span>아래 링크를 클릭하면 위에 적힌 비밀번호로 변경됩니다.</span>
      <p>로그인 후 다른 비밀번호로 변경해 주시기 바랍니다.</p>
      <p>링크를 클릭하지 않으면 비밀번호가 변경되지 않습니다.</p>
      <a
        href="http://localhost:8000/user/reset/${token}"
        rel="noreferrer noopener"
        target="_blank"
        >http://localhost:8000/user/reset/${token}</a
      >
    </div>`,
    };
    console.log(mailOptions);
    await transporter.sendMail(mailOptions);
    console.log("메일 발송 성공");

    console.log(data);
    res.send("메일발송성공");
  } catch (err) {
    console.log(err);
    res.status(500).send("서버에러");
  }
});

router.get("/reset/:token", async (req, res) => {
  const { token } = req.params;
  try {
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
    res.status(200).send("비밀번호 변경 성공");
  } catch (err) {
    console.log(err);
    res.status(500).send("서버에러");
  }
});
// const token = crypto.randomBytes(20).toString("hex");
//     const data = { token, mail: user[0].email, ttl: 300 };
router.post("/sendpassword", async (req, res) => {});

router.get("/logout", async (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    } else {
      console.log("로그아웃 성공");
      res.redirect("/user");
    }
  });

  router.use((err, req, res, next) => {
    console.error(err.stack); // 에러 스택 출력
    res.status(500).send("서버 에러");
  });

  // req.session.save(() => {
  //   res.redirect("/");
  // });
});

router.post("/ex", async (req, res) => {
  const { email } = req.body;
  console.log(`req.body에 있는 email: ${email}`);
  try {
    sql = `SELECT * FROM users WHERE email = ?`;
    const [user] = await db.query(sql, [email]);
    console.log(`-----------user------------`);
    console.log(user.length);
    console.log(`-----------end------------`);
    console.log(`-----------user[0]------------`);
    //console.log(user[0].length);
    console.log(`-----------end------------`);
    if (user.length === 0) {
      return res.status(400).send("존재하지 않는 이메일입니다.");
    }
  } catch (err) {
    console.log(err);
  }
});

router.get("/certify", (req, res) => {
  res.render("certify");
});

router.post("/certify", async (req, res) => {
  try {
    const { email } = req.body;
    const certifyResponse = await axios.post(
      "https://univcert.com/api/v1/certify",
      {
        key: `${process.env.UNIVCERT_KEY}`,
        email: "c1004sos@wku.ac.kr",
        univName: "원광대학교",
        univ_check: true,
      }
    );

    console.log(certifyResponse.data);
  } catch (err) {
    console.log(err);
    res.status(500).send("서버에러");
  }
});

router.get("/check", (req, res) => {
  const user = req.session.passport;
  console.log("user -> ", user);
  res.send(user);
});

router.get("/test", (req, res) => {
  console.log(process.env.KAKAO_ID);
});

router.get("/kakao", passport.authenticate("kakao"));

router.get(
  "/kakao/callback",
  passport.authenticate("kakao", { failureRedirect: "/user" }),
  (req, res) => {
    console.log("유저정보: ", req.user);
    res.redirect(
      "http://localhost:3000/login-success?user=" +
        JSON.stringify({
          email: req.user[0].email,
          nickname: req.user[0].nickname,
        })
    );
  }
);
module.exports = router;
