const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isLoggedIn } = require("../config/middleware");

router.get("/:postId", isLoggedIn, async (req, res) => {
  try {
    const userId = req.session.passport.user[0].id;
    const { postId } = req.params;

    const checkSql = "SELECT * FROM likes WHERE userId = ? AND postId = ?";
    const [rows] = await db.query(checkSql, [userId, postId]);

    if (rows.length > 0) {
      res.status(200).json({ isLiked: true });
    } else {
      res.status(200).json({ isLiked: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

router.post("/:postId", isLoggedIn, async (req, res) => {
  const updateLikesCount = async (postId, increment) => {
    const updateQuery =
      "UPDATE postings SET likesCount = likesCount + ? WHERE id = ?";
    const selectQuery = "SELECT likesCount FROM postings WHERE id = ?";

    await db.query(updateQuery, [increment ? 1 : -1, postId]);
    const [likesResult] = await db.query(selectQuery, [postId]);

    if (likesResult.length === 0) throw new Error("Post not found.");

    return likesResult[0].likesCount;
  };

  try {
    const userId = req.session.passport.user[0].id;
    const { postId } = req.params;

    const checkSql = "SELECT * FROM likes WHERE userId = ? AND postId = ?";
    const [rows] = await db.query(checkSql, [userId, postId]);
    let message, isLiked, updatedLikesCount;

    if (rows.length > 0) {
      // 좋아요 취소
      const unlikeSql = "DELETE FROM likes WHERE userId = ? AND postId = ?";
      await db.query(unlikeSql, [userId, postId]);

      updatedLikesCount = await updateLikesCount(postId, false);
      message = "좋아요를 취소하였습니다.";
      isLiked = false;
    } else {
      // 좋아요 추가
      const likeSql = "INSERT INTO likes (userId, postId) VALUES (?, ?)";
      await db.query(likeSql, [userId, postId]);

      updatedLikesCount = await updateLikesCount(postId, true);
      message = "좋아요!";
      isLiked = true;
    }

    res.status(200).json({
      message: message,
      isLiked: isLiked,
      likesCount: updatedLikesCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;
