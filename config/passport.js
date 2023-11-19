const dotenv = require("dotenv");
dotenv.config();
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const KakaoStrategy = require("passport-kakao").Strategy;
const bcrypt = require("bcrypt");
const db = require("../config/db");
const { search } = require("../routes/profile");

passport.use(
  "local",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      console.log("passport의 local-login : ", email);
      let users;
      try {
        sql = "SELECT * FROM users WHERE email = ?";
        [users] = await db.query(sql, [email]);
      } catch (err) {
        console.log(err);
      }
      console.log(users);
      //DB 연결 실패등의 에러
      if (users.length === 0) {
        console.log("사용자가 일치하지 않습니다.");
        return done(null, false, {
          code: 401,
          success: false,
          message: "사용자가 일치하지 않습니다.",
        });
      }
      //비밀번호가 일치하지 않을 경우
      const isMatch = await bcrypt.compare(password, users[0].password);
      if (!isMatch) {
        console.log("비밀번호가 일치하지 않습니다.");
        return done(null, false, {
          code: 401,
          success: false,
          message: "비밀번호가 일치하지 않습니다.",
        });
      }
      //비밀번호가 일치할 경우
      console.log("비밀번호 일치!");
      return done(null, users);
    }
  )
);

passport.use(
  "kakao",
  new KakaoStrategy(
    {
      clientID: process.env.KAKAO_ID,
      callbackURL: "/user/kakao/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      let user;
      try {
        console.log("----passport.use 시작 ----");
        console.log(`----profile.id: ${profile._json.id} ----`);
        console.log(`----profile.platformType: ${profile.provider} ----`);
        console.log(`----profile.nickname: ${profile.username} ----`);
        console.log(
          `----profile.email: ${profile._json.kakao_account.email} ----`
        );

        const searchSql =
          "SELECT * FROM users WHERE email = ? AND platformType = ?";
        [user] = await db.query(searchSql, [
          profile._json.kakao_account.email,
          "kakao",
        ]);
        console.log("----user: ----", user);
        console.log("----user: ----", user);
        console.log("----user 끝----");
        console.log("----user.length: ----", user.length);

        // 이미 가입된 카카오 프로필이면 성공
        if (user.length > 0) {
          console.log("----카카오 계정으로 로그인 시작 ----");
          console.log(profile);
          return done(null, user, {
            code: 200,
            success: true,
            message: "카카오 계정으로 로그인 성공",
          });
        } else if (user.length === 0) {
          console.log("----카카오 계정으로 회원가입 시작 ----");

          // 로컬로 회원가입된 이메일이 있는경우
          const searchSql2 =
            "SELECT * FROM users WHERE email = ? AND platformType = ?";
          const [user2] = await db.query(searchSql2, [
            profile._json.kakao_account.email,
            "local",
          ]);
          if (user2.length > 0) {
            console.log("----카카오 계정으로 회원가입 실패 ----");
            return done(null, false, {
              code: 401,
              success: false,
              message: "이미 가입한 이메일 계정이 있습니다.",
            });
          }
          console.log("중복이메일x 회원정보생성");

          // db에 회원정보 생성
          let [results] = await db.query(
            "INSERT INTO users (_id, platformType, nickname, email, password) VALUES (?, ?, ?, ?, ?)",
            [
              profile._json.id,
              "kakao",
              profile.username,
              profile._json.kakao_account.email,
              0,
            ]
          );
          console.log("----카카오 계정으로 회원가입 성공 ----");
          const searchSql3 = "SELECT * FROM users WHERE email = ?";
          const [user3] = await db.query(searchSql3, [
            profile._json.kakao_account.email,
          ]);

          console.log(user3);
          console.log(1);
          return done(null, user3, {
            code: 200,
            success: true,
            message: "카카오 계정으로 회원가입 성공",
          });
        }
      } catch (error) {
        console.error(error);
        return done(error);
      }
    }
  )
);

passport.serializeUser(function (user, done) {
  console.log("serializeUser() 호출됨.");

  const user2 = {
    id: user[0].id,
    platformType: user[0].platformType,
    nickname: user[0].nickname,
    email: user[0].email,
    regDate: user[0].regDate,
    verified: user[0].verified,
    _id: user[0]._id,
    univName: user[0].univName,
    img: user[0].img,
  };
  console.log(user2);

  done(null, user2);
});

passport.deserializeUser(function (user, done) {
  console.log("deserializeUser() 호출됨.");
  console.log(user);
  done(null, user);
});

module.exports = passport;
