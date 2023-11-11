const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn, isAdmin } = require("../config/middleware");

router.get("/:userId", isLoggedIn, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { id } = req.session.passport.user[0];
    if (userId !== id) {
      //본인 알람을 다른 사람이 요청했을경우
      return res
        .status(403)
        .json({ message: "올바르지 않은 유저의 알림을 불러왔습니다." });
    }

    const selectNotificationSql =
      "SELECT notifications.*, postings.title \
      FROM notifications \
      JOIN postings ON notifications.postId = postings.id\
      WHERE notifications.targetUserId = ? \
      ORDER BY notifications.id DESC;";

    const [notifications] = await db.query(selectNotificationSql, [userId]);

    if (notifications.length === 0) {
      return res.status(400).json({ message: "알림이 없습니다." });
    }

    res.status(200).json({
      message: "알림 조회가 성공적으로 완료되었습니다.",
      content: notifications,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "알림 조회 서버에러" });
  }
});

router.get("/read/:id", isLoggedIn, async (req, res) => {
  const { id } = req.session.passport.user[0];
  try {
    const notifyId = Number(req.params.id);

    const checkSql = "SELECT targetUserId FROM notifications WHERE id = ?";
    const [rows] = await db.query(checkSql, [notifyId]);
    if (rows[0].targetUserId !== id) {
      return res.status(403).json({ message: "올바르지 않은 요청입니다." });
    }

    const updateSql = "UPDATE notifications SET readType = 1 WHERE id = ?";
    await db.query(updateSql, [notifyId]);

    res.status(200).json({
      message: "알림이 성공적으로 읽혔습니다.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "알림 읽기 서버에러" });
  }
});

router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    const notifyId = Number(req.params.id);
    const { id } = req.session.passport.user[0];

    const checkSql = "SELECT targetUserId FROM notifications WHERE id = ?";
    const [rows] = await db.query(checkSql, [notifyId]);
    console.log("rows -> ", rows);
    if (rows[0].targetUserId !== id) {
      return res.status(403).json({ message: "올바르지 않은 요청입니다." });
    }

    const deleteSql = "DELETE from notifications WHERE id = ?";
    await db.query(deleteSql, [notifyId]);

    res.status(200).json({
      message: "알림이 성공적으로 제거되었습니다.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "알림 읽기 서버에러" });
  }
});

module.exports = router;
