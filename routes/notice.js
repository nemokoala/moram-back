const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn, isAdmin } = require("../config/middleware");

//1. 공지 전체 조회하기
router.get("/", async (req, res) => {
  try {
    const allSql = "SELECT id, title, writeTime, nickname FROM notices";
    const [results] = await db.query(allSql);
    res.status(200).json({ content: results });
  } catch (error) {
    res.status(500).json({ message: "db에러" });
    console.error(error);
  }
});

//2. 특정 공지 조회하기
router.get("/:id", async (req, res) => {
  try {
    const notId = req.params.id;
    const allSql = "SELECT * FROM notices WHERE id =? ";
    const [results] = await db.query(allSql, notId);
    if (results.length === 0) {
      return res
        .status(400)
        .json({ message: "해당 공지를 찾을 수 없습니다. " });
    }
    res.json({ content: results[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다. " });
  }
});

//3. 관리자가 공지 추가하기
router.post("/", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const writeTime = new Date();
    const { title, content } = req.body;
    const adminId = Number(req.session.passport.user[0].id);
    const adminNickname = req.session.passport.user[0].nickname;

    const addSql =
      "INSERT INTO notices (userId, title, content, writeTime, nickname) VALUES (?, ?, ?, ?, ?)";

    const values = [adminId, title, content, writeTime, adminNickname];

    const [results] = await db.query(addSql, values);
    res.status(201).json({
      message: "공지 작성 완료.",
      comment: {
        title,
        content,
        writeTime,
        adminNickname,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "공지 추가 서버에러 " });
  }
});

//4. 관리자 공지 삭제 기능
router.delete("/:id", isLoggedIn, isAdmin, async (req, res) => {
  const noticeId = Number(req.params.id);
  try {
    const deleteSql = "DELETE FROM notices WHERE id=? ";
    const [results] = await db.query(deleteSql, [noticeId]);

    if (results.length === 0) {
      res
        .status(400)
        .json({ message: "해당하는 공지글이 더 이상 존재하지 않습니다." });
      return;
    }
    res.status(200).json({ message: "공지글이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
    console.error(error);
  }
});

//5. 관리자 공지 수정 기능
router.put("/:id", isLoggedIn, isAdmin, async (req, res) => {
  const updateTime = new Date();
  const noticeId = Number(req.params.id);
  const { title, content } = req.body;
  const adminId = Number(req.session.passport.user[0].id);
  const adminNickname = req.session.passport.user[0].nickname;

  try {
    const selectSql = "SELECT * FROM notices WHERE id = ?";
    const [selected] = await db.query(selectSql, noticeId);

    //해당 글이 존재하는지
    if (selected.length === 0) {
      res
        .status(400)
        .json({ message: "해당하는 공지글이 더 이상 존재하지 않습니다. " });
      return;
    }

    //글이 존재한다면 수정하기
    const updateSql =
      "UPDATE notices SET userId = ?, title = ?, content = ?, updateTime =?, nickname = ? WHERE id = ?";
    const values = [
      adminId,
      title,
      content,
      updateTime,
      adminNickname,
      noticeId,
    ];

    const [results] = await db.query(updateSql, values);
    res.status(200).json({
      message: "공지 업데이트 완료.",
      comment: {
        title,
        content,
        adminNickname,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "공지 업데이트 서버 에러 " });
  }
});
module.exports = router;
