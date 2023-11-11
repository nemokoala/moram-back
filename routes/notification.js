const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn, isAdmin } = require("../config/middleware");

router.get("/:userId", isLoggedIn, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
  
      const selectNotificationSql = "SELECT * FROM notifications WHERE targetUserId = ? AND readType = 0 ORDER BY id DESC";
 
      const [notifications] = await db.query(selectNotificationSql, [userId]);
  
      if (notifications.length === 0) {
        return res.status(404).json({ message: "알림을 찾을 수 없습니다." });
      }
  
      res.status(200).json({
        message: "알림 조회가 성공적으로 완료되었습니다.",
        notifications
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "알림 조회 서버에러" });
    }
  });

  router.post("read/:id", isLoggedIn, async (req, res) => {
    try {
      const notifyId = Number(req.params.id);
  
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

  module.exports = router;
  
  