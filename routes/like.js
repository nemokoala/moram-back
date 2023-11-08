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
      res.status(200).json({content: { isLiked: true }});
    } else {
      res.status(200).json({content: { isLiked: false }});
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

    // 게시글 작성자 확인
    const postSql = "SELECT userId FROM postings WHERE id = ?";
    const [postRows] = await db.query(postSql, [postId]);

    // 게시글이 존재하지 않는 경우
    if (postRows.length === 0) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    // 게시글 작성자와 현재 사용자가 같은 경우
    if (postRows[0].userId === userId) {
      return res.status(400).json({ message: "자신의 게시글에는 좋아요를 누를 수 없습니다." });
    }

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
      message: message, content:{isLiked: isLiked, likesCount: updatedLikesCount}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;
