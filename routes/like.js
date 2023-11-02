const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isLoggedIn} = require("../config/middleware");


router.post("/:postId", isLoggedIn, async (req, res) => {
  try {
    const userId = req.session.passport.user[0].id;
    const { postId } = req.params;

    const checkSql = "SELECT * FROM likes WHERE userId = ? AND postId = ?";
    const [rows] = await db.query(checkSql, [userId, postId]);

    if (rows.length > 0) {
      const unlikeSql = "DELETE FROM likes WHERE userId = ? AND postId = ?";
      await db.query(unlikeSql, [userId, postId]);

      const updatelikeSql = "UPDATE postings SET likesCount = likesCount - 1 WHERE id = ?";
      await db.query(updatelikeSql, [postId]);

      res.status(200).json({ message: "좋아요를 취소하였습니다.", isLiked: false });
    } else {
      const likedSql = "INSERT INTO likes (userId, postId) VALUES (?, ?)";
      await db.query(likedSql, [userId, postId]);

      const updatePostSql = "UPDATE postings SET likesCount = likesCount + 1 WHERE id = ?";
      await db.query(updatePostSql, [postId]);

      res.status(200).json({ message: "좋아요!", isLiked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});


  
  module.exports = router;
  