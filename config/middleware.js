const bcrypt = require("bcrypt");
exports.isLoggedIn = (req, res, next) => {
  // isAuthenticated()로 검사해 로그인이 되어있으면
  if (req.isAuthenticated()) {
    next(); // 다음 미들웨어
  } else {
    res.status(403).json({ message: "로그인 필요합니다." });
  }
};

exports.isNotLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    next(); // 로그인 안되어있으면 다음 미들웨어
  } else {
    //const message = encodeURIComponent("로그인한 상태입니다.");
    res.status(403).send("로그인한 상태입니다.");
    //res.redirect(`/?error=${message}`);
  }
};

exports.generatePassword = async () => {
  const specialChars = "!@#$%^&*";
  const numbers = "0123456789";
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let password = "";

  // 특수문자, 숫자, 영문자 각각 1개씩 랜덤하게 선택하여 비밀번호에 추가
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += letters[Math.floor(Math.random() * letters.length)];

  // 나머지 자리를 랜덤하게 영문자, 숫자, 특수문자 중에서 선택하여 추가
  for (let i = 0; i < 5; i++) {
    const randomCharType = Math.floor(Math.random() * 3);

    if (randomCharType === 0) {
      password += letters[Math.floor(Math.random() * letters.length)];
    } else if (randomCharType === 1) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
    } else {
      password += specialChars[Math.floor(Math.random() * specialChars.length)];
    }
  }

  // 비밀번호를 랜덤하게 섞음
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return password;
};

exports.isAdmin = (req, res, next) => {
  //요청한 사용자가 존재하고 그 역할이 admin일 경우
  if (req.session?.passport?.user[0]?.role === "admin") {
    next();
  } else {
    res.status(403).send("관리자 권한이 필요합니다. ");
  }
};
