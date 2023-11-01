const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isLoggedIn} = require("../config/middleware");

//좋아요 중복기능
router.get("/:postId", isLoggedIn, async (req, res) => {
  try {
    const { userId } = req.user;
    const { postId } = req.params;

    const checkSql = "SELECT * FROM likes WHERE userId = ? AND postId = ?";
    const [rows] = await db.query(checkSql, [userId, postId]);

    if (rows.length > 0) {
      res.status(200).json({ message: "이미 좋아요를 눌렀습니다.", isLiked: true });
    } else {
      res.status(200).json({ message: "좋아요를 누를 수 있습니다.", isLiked: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

//좋아요 기능
router.post("/:postId", isLoggedIn, async (req, res) => {
  try {
    const { userId } = req.user;
    const { postId } = req.params;

    const likedSql = "INSERT INTO likes (userId, postId) VALUES (?, ?)";
    await db.query(likedSql, [userId, postId]);

    const updatePostSql = "UPDATE postings SET likesCount = likesCount + 1 WHERE id = ?";
    await db.query(updatePostSql, [postId]);

    res.status(200).json({ message: "좋아요!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});


  
  // 좋아요 취소 기능
  router.delete("/:postId", isLoggedIn, async (req, res) => {
    try {
      const { userId, postId } = req.body;
      const unlikeSql = "DELETE FROM likes WHERE userId = ? AND postId = ?";
      const [result] = await db.query(unlikeSql, [userId, postId]);
  
      if (result.affectedRows > 0) {
        const updatelikeSql = "UPDATE postings SET likesCount = likesCount - 1 WHERE id = ?";
        await db.query(updatelikeSql, [postId]);
  
        res.status(200).json({ message: "좋아요를 취소하였습니다." });
      } else {
        res.status(400).json({ message: "좋아요를 먼저 눌러주세요." });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "서버 오류입니다." });
    }
  });

  
  module.exports = router;
  