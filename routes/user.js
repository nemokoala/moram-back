const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const session = require("express-session");
router.use(session({ secret: "secret key" }));
router.use(express.json());

const requireLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

router.get("/", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM user");
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
  hash = await bcrypt.hash(password, 12);

  const sql = `INSERT INTO users (nickname, email, password) VALUES (?, ?, ?)`;
  try {
    await db.query(sql, [nickname, email, hash]);
    res.status(200).send("회원가입 성공");
  } catch (err) {
    console.log(err);
  }
});

router.get("/login", (req, res) => {
  res.send("login");
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const sql = `SELECT * FROM users WHERE email = ?`;
  try {
    const [result] = await db.query(sql, [email]);
    if (result.length === 0) {
      res.status(400).send("가입되지 않은 이메일입니다.");
    } else {
      const compare = await bcrypt.compare(password, result[0].password);
      if (compare) {
        req.session.user = result[0].nickname;
        res.status(200).send("로그인 성공");
      } else {
        res.status(400).send("비밀번호가 틀렸습니다.");
      }
    }
  } catch (err) {
    console.log(err);
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy();
});

router.get("/", requireLogin, (req, res) => {
  res.send(`Hello ${req.session.user}`);
});

module.exports = router;
