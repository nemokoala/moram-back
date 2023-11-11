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
const { returnUser } = require("../config/middleware");
const smtpTransport = require("../config/email");
const {
  generatePassword,
  isLoggedIn,
  isNotLoggedIn,
} = require("../config/middleware");
const { type } = require("os");

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

// Email 유효성 검사 함수, 형식에 맞으면 true 리턴 틀리면 false 리턴
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

function validateNickname(nickname) {
  const regex = /^[a-zA-Z0-9가-힣]{2,16}$/;
  return regex.test(nickname);
}

router.get("/", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM users");
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.error(error);
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

router.post("/changepw", async (req, res) => {
  const { email, prepw, newpw } = req.body;

  try {
    if (email !== req.user[0].email) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "현재 로그인세션과 이메일이 일치하지않습니다.",
      });
    }
    if (!validatePassword(newpw)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "유효한 형식의 비밀번호가 아닙니다.",
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

    const hash = await bcrypt.hash(newpw, 12);
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
    res.status(500).json({ message: "서버 에러" });
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
      return res.status(400).json({ message: "존재하지 않는 이메일입니다." });
    }
  } catch (err) {
    console.log(err);
  }
});

// router.get("/certify", (req, res) => {
//   res.render("certify");
// });

router.post("/certify", async (req, res) => {
  console.log(req.body);
  const { univName, receivedEmail } = req.body;
  const verifiedEmail = req.user[0].email;
  //email = c1004sos@wku.ac.kr
  const sql = `SELECT * FROM univList WHERE univName = ?`;
  const [result] = await db.query(sql, [univName]);
  console.log(`DB에서 받아온 result: ${JSON.stringify(result)}`);
  // db에 해당 대학교가 있는지 확인
  if (result.length === 0) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "대학교를 찾을 수 없습니다.",
    });
  }
  // 대학교 이메일 형식과 일치하는지 확인
  const emailDomain = receivedEmail.substring(
    receivedEmail.lastIndexOf("@") + 1
  );
  if (emailDomain !== result[0].email) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: `대학교 이메일이 일치하지않습니다. 해당 대학 도메인은 ${result[0].email} 입니다.`,
    });
  }
  //토큰 생성
  const token = crypto.randomBytes(20).toString("hex");
  // 1일 뒤에 만료되는 토큰
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  //db에 토큰 저장
  const tokenSql = `INSERT INTO univVerification (univName, receivedEmail, verifiedEmail, token, expiresAt) VALUES (?, ?, ?, ?, ?)`;

  await db.query(tokenSql, [
    univName,
    receivedEmail,
    verifiedEmail,
    token,
    expiresAt,
  ]);

  // 대학교 인증 메일 발송
  console.log(emailDomain);

  console.log(token);
  try {
    let transporter = smtpTransport;
    let mailOptions = {
      from: "c1004sos@1gmail.com", //송신할 이메일
      to: receivedEmail, //수신할 이메일
      subject: "[모람모람]대학교 인증 메일입니다.",
      html: ` <div>
      <p>안녕하세요.</p>
      <hr />
      <span>아래 링크를 클릭하면 학교 이메일 인증이 완료됩니다.</span>
      <a
        href="http://localhost:8000/user/univActivate/${token}"
        rel="noreferrer noopener"
        target="_blank"
        >http://localhost:8000/user/univActivate/${token}</a
      >
    </div>`,
    };
    await transporter.sendMail(mailOptions);
    console.log("메일발송성공");
    res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "서버에러" });
  }
});

router.get("/univActivate/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const sql = `SELECT * FROM univVerification WHERE token = ? AND expiresAt > NOW()`;
    const [result] = await db.query(sql, [token]);
    if (result.length === 0) {
      res.status(400).json({
        code: 400,
        success: false,
        message: "만료된 토큰입니다.",
      });
    }
    const univName = result[0].univName;
    const email = result[0].verifiedEmail;
    console.log(`대학이름: ${univName}, db상에서 수정될 이메일: ${email}`);
    const searchSql = `SELECT * FROM users WHERE email = ?`;
    const [user] = await db.query(searchSql, [email]);
    console.log(user);
    const updateSql = `UPDATE users SET verified = ?, univName = ? WHERE email = ?`;
    const [updateResult] = await db.query(updateSql, [1, univName, email]);
    console.log(updateResult);
    const deleteSql = `DELETE FROM univVerification WHERE token = ?`;
    await db.query(deleteSql, [token]);
    res.status(200).json({
      code: 200,
      success: true,
      message: "대학교 인증이 완료되었습니다.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "서버에러" });
  }
});
//실시간 검색
router.post("/univsearch", async (req, res) => {
  const univName = req.body.univName;
  console.log(req.body);
  console.log(univName);
  try {
    //univName이 들어가는 모든 대학 검색
    const sql = "SELECT * FROM univList WHERE univName LIKE ?";
    const [result] = await db.query(sql, ["%" + univName + "%"]);
    res.status(200).json(result);
    console.log(result);
  } catch (err) {
    res.status(500).json({ message: "서버에러" });
  }
});

router.post("/univdelete", async (req, res) => {
  const { email } = req.body;
  try {
    const sql = `UPDATE users SET verified = ?, univName = ? WHERE email = ?`;
    const [result] = await db.query(sql, [0, null, email]);
    console.log(result);
    res.status(200).json({
      code: 200,
      success: true,
      message: "대학교 인증이 해제되었습니다.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: `서버에러${err}` });
  }
});

router.get("/upload", async (req, res) => {
  try {
    const data = fs.readFileSync("univList.json", "utf8");
    const univData = JSON.parse(data);

    // 각 대학의 데이터를 univList 테이블에 저장
    univData.forEach((univ) => {
      const univName = univ.univName;
      const email = univ.email;

      const sql = `INSERT INTO univList (univName, email) VALUES (?, ?)`;
      db.query(sql, [univName, email]);
      console.log(univName, email);
    });
    console.log("성공!");
    res.json({ message: "성공!" });
  } catch (err) {
    console.log(err);
  }
});

router.get("/check", (req, res) => {
  const user = req.session?.passport?.user || null;
  console.log("user -> ", user);
  if (user) return res.status(200).json({ content: returnUser(user[0]) });
  else return res.status(403).json({ message: "로그인 정보가 없습니다." });
});

router.get("/test", async (req, res) => {
  const certifyResponse = await axios.post(
    "http://localhost:8000/user/certify",
    {
      key: `${process.env.UNIVCERT_KEY}`,
      email: "c1004sos@wku.ac.kr",
      univName: "원광대학교",
      univ_check: true,
    }
  );
});

router.get("/kakao", passport.authenticate("kakao"));

router.get("/kakao/callback", (req, res, next) => {
  passport.authenticate("kakao", (err, user, info) => {
    // passport-kakao 전략 done 함수의 파라미터가 여기 콜백 함수의 인자로 전달된다.
    if (err) {
      return next(err);
    }
    if (!user) {
      console.log(info);
      return res.json(info);
    }

    // 회원가입된 상태일 경우, 로그인 세션을 생성한다.
    return req.login(user, (error) => {
      if (error) {
        next(error);
      }
      res.redirect(
        "https://www.moram2.com/login-success?user=" +
          JSON.stringify({
            email: req.user[0].email,
            nickname: req.user[0].nickname,
          })
      );
    });
  })(req, res, next); // 미들웨어 내의 미들웨어에는 호출 별도로 진행
});

router.delete("/user", isLoggedIn, async (req, res) => {
  const email = req.user[0].email;

  try {
    console.log(1);
    const sql = `DELETE FROM users WHERE email = ?`;
    const [result] = await db.query(sql, [email]);
    console.log(result);
    res.status(200).json({
      code: 200,
      success: true,
      message: "회원탈퇴가 완료되었습니다.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "회원탈퇴서버에러" });
  }
});

router.post("/ask", async (req, res) => {
  try {
    const { email, category, title, content } = req.body;

    if (
      email.length === 0 ||
      category.length === 0 ||
      title.length === 0 ||
      content.length === 0
    ) {
      res.status(400).json({
        code: 400,
        success: false,
        message: "모든 항목을 입력해주세요.",
      });
    }
    //오버플로우 방지
    if (title.length > 100) {
      res.status(400).json({
        code: 400,
        success: false,
        message: "제목은 100자 이내로 입력해주세요.",
      });
    }
    //오버플로우 방지
    if (content.length > 1000) {
      res.status(400).json({
        code: 400,
        success: false,
        message: "내용은 1000자 이내로 입력해주세요.",
      });
    }
    //이메일 유효성 검사
    if (!validateEmail(email)) {
      res.status(400).json({
        code: 400,
        success: false,
        message: "유효한 형식의 이메일이 아닙니다.",
      });
    }
    //카테고리 유효성 검사
    if (category !== "문의" && category !== "건의") {
      res.status(400).json({
        code: 400,
        success: false,
        message: "유효한 형식의 카테고리가 아닙니다.",
      });
    }
    console.log("유효성 검사 완료");
    let transporter = smtpTransport;
    let mailOptions = {
      from: `${process.env.EMAIL}`, //송신할 이메일
      to: `${process.env.EMAIL}`, //수신할 이메일
      subject: `[모람모람/문의(${category})] 제목: ${title}`,
      html: ` <div>
      <p>문의 내용은 아래와 같습니다.</p>
      <hr />
      <ul>
        <li>답변받을이메일 : ${email}</li>
      </ul>
      <span>${title}</span>
      <p>${content}</p>
    </div>`,
    };
    console.log(mailOptions);
    await transporter.sendMail(mailOptions);
    console.log("메일 발송 성공");

    res.status(200).json({ message: "메일발송성공" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "게시글작성서버에러" });
  }
});
module.exports = router;
