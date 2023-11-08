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

router.get("/", (req, res) => {
  res.json("profile");
});
//내가 작성한 글 불러오는 api
router.post("/", isLoggedIn, async (req, res) => {
  const userID = req.user[0].id;
  console.log(userID);
});

module.exports = router;
