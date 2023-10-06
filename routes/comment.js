const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");
const passport = require("../config/passport");
const { isloggedin, isnotloggedin } = require("../config/middleware");
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.get("/test", (req, res) => {
  res.send("test");
  console.log(req.session.passport);
});

router.get("/", async (req, res) => {
  //댓글 모든 내용 불러오기
  try {
    const allSql = "SELECT nickname, content, writeTime FROM comments";
    const [results] = await db.query(allSql);
    // const [results] = await db.query(
    //   "SELECT nickname, content, writeTime FROM comments"
    // );
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.error(error);
  }
});

router.post("/add", async (req, res) => {
  //댓글 추가 기능
  const writeTime = new Date();
  const { nickname, content } = req.body;
  console.log(req.body);
  try {
    const addSql =
      "INSERT INTO comments ( nickname, content, writeTime) VALUES (?, ?, ?)";
    const [results] = await db.query(addSql, [nickname, content, writeTime]);
    // const [results] = await db.query(
    //   "INSERT INTO comments ( nickname, content, writeTime) VALUES (?, ?, ?)",
    //   [nickname, content, writeTime]
    // );

    res.status(200).json({
      message: "댓글이 성공적으로 작성되었습니다.",
      comment: {
        nickname,
        content,
        writeTime,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.error(error);
  }
});

router.delete("/:id", async (req, res) => {
  // 댓글 삭제 기능
  const id = req.params.id;
  const userNickname = req.body.nickname;

  try {
    const commentSql = "SELECT * FROM comments WHERE id = ?";
    const [comments] = await db.query(commentSql, id);

    if (comments.length === 0) {
      res.status(404).send("해당하는 댓글이 더 이상 존재하지 않습니다.");
      return;
    }

    const commentNickname = comments[0].nickname;

    // 댓글 작성자와 요청한 사용자의 닉네임을 비교하여 권한 확인
    if (userNickname === commentNickname) {
      const deleteSql = "DELETE FROM comments WHERE id = ?";
      const [results] = await db.query(deleteSql, id);
      res.status(200).send("댓글이 삭제되었습니다.");
    } else {
      res.status(403).send("댓글을 삭제할 권한이 존재하지 않습니다.");
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "서버 에러" });
    console.error(error);
  }
});

module.exports = router;
