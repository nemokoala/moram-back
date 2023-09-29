const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  //댓글 모든 내용 불러오기
  try {
    const [results] = await db.query("SELECT * FROM user");
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.error(error);
  }
});

router.get("/add", async (req, res) => {
  //댓글 추가
  try {
    const [results] = await db.query("SELECT * FROM user");
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.error(error);
  }
});

//브랜치 테스트
//브랜치 이거 맞는건가 헷갈리네
module.exports = router;
