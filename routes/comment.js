const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.get("/", async (req, res) => {
  //댓글 모든 내용 불러오기
  try {
    const [results] = await db.query(
      "SELECT nickname, content, writeTime FROM comments"
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.error(error);
  }
});

function wTime() {
  var today = new Date();
  var year = today.getFullYear();
  var month = ("0" + (today.getMonth() + 1)).slice(-2);
  var date = ("0" + today.getDate()).slice(-2);
  var hours = ("0" + today.getHours()).slice(-2);
  var minutes = ("0" + today.getMinutes()).slice(-2);
  var seconds = ("0" + today.getSeconds()).slice(-2);

  return (
    year +
    "-" +
    month +
    "-" +
    date +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds
  );
}

router.post("/add", async (req, res) => {
  //댓글 추가 기능
  const writeTime = wTime();
  const { nickname, content } = req.body;
  try {
    const [results] = await db.query(
      "INSERT INTO comments ( nickname, content, writeTime) VALUES (?, ?, ?)",
      [nickname, content, writeTime]
    );

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
  const { id } = req.params;
  const userNickname = req.headers["user-nickname"]; //클라이언트에서 헤더에 유저닉네임을 전달

  try {
    const [comments] = await db.query("SELECT * FROM comments WHERE id = ?", [
      id,
    ]);
    if (comments.length === 0) {
      res.status(404).send("해당하는 댓글이 더 이상 존재하지 않습니다.");
      return;
    }

    //해당 댓글id에 해당하는 댓글, 게시글 작성자 nickname 가져오기
    const [possiblNicknames] = await db.query(
      `SELECT comments.nickname AS commentNickname, postings.nickname AS postNickname 
       FROM comments 
       JOIN postings ON comments.postId = postings.id 
       WHERE comments.id = ?`,
      [id]
    );

    if (!possiblNicknames || possiblNicknames.length === 0) {
      res.status(500).send("서버 에러");
      return;
    }

    if (
      userNickname === possiblNicknames[0].commentNickname ||
      userNickname === possiblNicknames[0].postNickname
    ) {
      await db.query("DELETE FROM comments WHERE id = ?", [id]);
      res.status(200).send("댓글이 삭제되었습니다.");
    } else {
      res.status(403).send("댓글을 삭제할 권한이 존재하지 않습니다");
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "서버 에러" });
    console.error(error);
  }
});

module.exports = router;
