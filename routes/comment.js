const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.get("/", async (req, res) => {
  //댓글 모든 내용 불러오기
  try {
    const [results] = await db.query("SELECT * FROM comments");
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

  // YYYY-MM-DD HH:MM:SS 형식으로 반환
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
  // 댓글 추가
  const writeTime = wTime();
  const { nickname, content } = req.body;

  try {
    const [results] = await db.query(
      "INSERT INTO comments ( nickname, content, writeTime) VALUES (?, ?, ?)",
      [nickname, content, writeTime]
    );
    res.status(200).send("댓글을 성공적으로 작성하였습니다.");
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.error(error);
  }
});

module.exports = router;
