const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const session = require("express-session");
//const ejs = require("ejs");
const passport = require("../config/passport");

router.use(express.urlencoded({ extended: false }));
router.use(express.json());

const requireLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};
const validateUserId = (userid) => {
  const useridRegex = /^[a-zA-Z0-9]{4,10}$/;
  return useridRegex.test(userid);
};

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
  res.render("register");
});

router.post("/register", async (req, res) => {
  console.log(req.body);
  const { userid, email, password } = req.body;

  if (!validateUserId(userid)) {
    return res.status(400).send("Invalid userid.");
  }
  if (!validateEmail(email)) {
    return res.status(400).send("Invalid email.");
  }
  if (!validatePassword(password)) {
    return res.status(400).send("Invalid password.");
  }

  try {
    const userSql = "SELECT * FROM users WHERE userid = ? OR email = ?";
    const [users] = await db.query(userSql, [userid, email]);
    if (users.length > 0) {
      return res.status(400).send("Userid or Email already exists");
    }

    const sql = `INSERT INTO users (userid, email, password) VALUES (?, ?, ?)`;
    hash = await bcrypt.hash(password, 12);
    await db.query(sql, [userid, email, hash]);
    res.status(200).send("회원가입 성공");
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

router.get("/login", (req, res) => {
  res.render("login");
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
      return res.redirect("/");
    });
  })(req, res, next); //! 미들웨어 내의 미들웨어에는 콜백을 실행시키기위해 (req, res, next)를 붙인다.
});

// router.post(
//   "/login",
//   passport.authenticate("local", {
//     successRedirect: "/user",
//     failureRedirect: "/user/login",
//     failWithError: true,
//   })
// );

router.use((err, req, res, next) => {
  if (req.authErr) {
    return res.status(401).send("로그인실패");
  }
  next(err);
});
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   const sql = `SELECT * FROM users WHERE email = ?`;
//   try {
//     const [result] = await db.query(sql, [email]);
//     if (result.length === 0) {
//       res.status(400).send("가입되지 않은 이메일입니다.");
//     } else {
//       const compare = await bcrypt.compare(password, result[0].password);
//       if (compare) {
//         req.session.user = result[0].userid;
//         res.status(200).send("로그인 성공");
//       } else {
//         res.status(400).send("비밀번호가 틀렸습니다.");
//       }
//     }
//   } catch (err) {
//     console.log(err);
//   }
// });

router.get("/logout", (req, res) => {
  req.logout();
});

router.get("/check", (req, res) => {
  console.log(req.session.passport);
});

router.get("/test", (req, res) => {
  console.log(process.env.KAKAO_ID);
});

router.get("/kakao", passport.authenticate("kakao"));

router.get(
  "/kakao/callback",
  passport.authenticate("kakao", { failureRedirect: "/user" }),
  (req, res) => {
    res.redirect("/user/success");
  }
);

router.get("/success", (req, res) => {
  res.send("success");
});
module.exports = router;
