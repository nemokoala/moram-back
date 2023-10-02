const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const session = require("express-session");
const ejs = require("ejs");
router.use(session({ secret: "secret key" }));

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
        req.session.user = result[0].userid;
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
