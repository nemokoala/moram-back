const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isloggedin, isnotloggedin } = require("../config/middleware");
// 과 게시글 조회

router.get("/test", (req, res) => {
  res.send("test");
  console.log(req.session.passport);
});

router.get("/", async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT id, title, nickname, writeTime, hitCount, likesCount FROM postings where postings.category = ? ",
      [req.query.category]
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.error(error);
  }
});

// 특정 게시글 조회
router.get("/:id", async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT userId,nickname ,writeTime ,updateTime,title,content,img1Url,img2Url,img3Url,\
    likesCount,hitCount ,category ,tag FROM postings WHERE id = ?",
      [req.params.id]
    );
    if (results.length === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 새로운 게시글 추가
router.post("/add", async (req, res) => {
  const {
    userId,
    nickname,
    writeTime,
    updateTime,
    title,
    content,
    img1Url,
    img2Url,
    img3Url,
    likesCount,
    hitCount,
    category,
    tag,
  } = req.body;

  try {
    const [results] = await db.query(
      "INSERT INTO postings(userId,nickname ,writeTime ,updateTime,title,content,img1Url,img2Url,img3Url,\
        likesCount,hitCount ,category ,tag ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        userId,
        nickname,
        writeTime,
        updateTime,
        title,
        content,
        img1Url,
        img2Url,
        img3Url,
        likesCount,
        hitCount,
        category,
        tag,
      ]
    );

    res.status(201).json({ message: "게시물 작성이 완료되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 특정 게시글 업데이트
router.put("/update/:id", async (req, res) => {
  const {
    userId,
    nickname,
    writeTime,
    updateTime,
    title,
    content,
    img1Url,
    img2Url,
    img3Url,
    likesCount,
    hitCount,
    category,
    tag,
  } = req.body;

  try {
    const [results] = await db.query(
      "UPDATE postings SET userId=?, nickname=?, writeTime=?, updateTime=?, title=?, content=?, img1Url=?, img2Url=?, img3Url=?,\
        likesCount=? ,hitCount=? ,category=? ,tag=? WHERE id = ?",
      [
        userId,
        nickname,
        writeTime,
        updateTime,
        title,
        content,
        img1Url,
        img2Url,
        img3Url,
        likesCount,
        hitCount,
        category,
        tag,
        req.params.id,
      ]
    );

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    res.json({ message: "게시물이 수정되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 특정 게시글 삭제
router.delete("/delete/:id", async (req, res) => {
  try {
    const [results] = await db.query("DELETE FROM postings WHERE id = ?", [
      req.params.id,
    ]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    res.json({ message: "게시물이 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
