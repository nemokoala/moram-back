const jwt = require("jsonwebtoken");

module.exports.authenticateUser = async (req, res, next) => {
  const token = req.cookies.token || "";

  if (!token) return res.status(403).sned("토큰이 없습니다.");

  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY);
    const userId = payload.id;

    const [results] = await db.query("SELECT * FROM user WHERE id = ?", [
      userId,
    ]);
    if (!result) return res.status(404).send("사용자를 찾을 수 없습니다.");
    req.user = results[0];
    next();
    //성공 시
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(500).send("토큰이 만료되었거나 유효하지 않습니다.");
    } else {
      res.status(500).send("서버 오류 발생.");
    }
  }
};

/* 
module.exports.authenticateUser = (req, res, next) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};
*/

exports.isLoggedIn = (req, res, next) => {
  // isAuthenticated()로 검사해 로그인이 되어있으면
  if (req.isAuthenticated()) {
    next(); // 다음 미들웨어
  } else {
    res.status(403).send("로그인 필요");
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
