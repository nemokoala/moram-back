const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const db = require("../config/db");

passport.use(
  "local",
  new LocalStrategy(
    {
      usernameField: "userid",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, userid, password, done) => {
      console.log("passport의 local-login : ", userid, password);
      let users;
      try {
        sql = "SELECT * FROM users WHERE userid = ?";
        [users] = await db.query(sql, [userid]);
      } catch (err) {
        console.log(err);
      }
      console.log(users);
      //DB 연결 실패등의 에러
      if (users.length === 0) {
        console.log("사용자가 일치하지 않습니다.");
        return done(null, false, { message: "사용자가 일치하지 않습니다." });
      }
      //비밀번호가 일치하지 않을 경우
      const isMatch = await bcrypt.compare(password, users[0].password);
      if (!isMatch) {
        console.log("비밀번호가 일치하지 않습니다.");
        return done(null, false, { message: "비밀번호가 일치하지 않습니다." });
      }
      //비밀번호가 일치할 경우
      console.log("비밀번호 일치!");
      return done(null, users);
    }
  )
);

passport.serializeUser(function (user, done) {
  console.log("serializeUser() 호출됨.");
  console.log(user);
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  console.log("deserializeUser() 호출됨.");
  console.log(user);
  done(null, user);
});

module.exports = passport;
