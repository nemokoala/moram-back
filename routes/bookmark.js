const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn, isAdmin } = require("../config/middleware");

// 카테고리(학과) 북마크 불러오기
router.get("/category", isLoggedIn, async (req, res) => {
  const { category } = req.body;
  // 여기서 세션으로부터 userId와 nickname을 가져옵니다.
  const userId = req.session.passport.user[0].id;

  try {
    const addSql = "SELECT category FROM categoryBookmarks WHERE userId = ?";
    const [results] = await db.query(addSql, userId);
    let resultArr = results.map((item) => item.category);
    console.log("즐겨찾기 목록 : ", resultArr);
    res.status(200).json({ content: resultArr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 카테고리(학과) 북마크 추가/삭제
router.post("/category", isLoggedIn, async (req, res) => {
  const { category } = req.body;
  // 여기서 세션으로부터 userId와 nickname을 가져옵니다.
  console.log("포스트", req.session.passport);
  const userId = req.session.passport.user[0].id;

  try {
    const checkSql =
      "SELECT * FROM categoryBookmarks WHERE userId = ? AND category = ?";
    const [existing] = await db.query(checkSql, [userId, category]);

    // 조회된 결과가 있으면, 이미 추가된 것이므로 삭제 작업 실시
    if (existing.length > 0) {
      const deleteSql =
        "DELETE FROM categoryBookmarks WHERE userId = ? AND category = ?";
      const values = [userId, category];
      const [results] = await db.query(deleteSql, values);
      return res
        .status(200)
        .json({ message: `${category}가 즐겨찾는 학과에서 제거되었습니다.` });
    }

    //데이터가 없을경우 추가 작업실행
    const addSql =
      "INSERT INTO categoryBookmarks (userId, category)\
       VALUES (?, ?)";
    const values = [userId, category];
    const [results] = await db.query(addSql, values);
    res
      .status(200)
      .json({ message: `${category}가 즐겨찾는 학과에 추가되었습니다.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

module.exports = router;
