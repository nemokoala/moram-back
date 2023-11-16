const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isnotloggedin, isLoggedIn, isAdmin } = require("../config/middleware");
const openai = require("../config/chatgpt");

router.get("/count", isLoggedIn, async (req, res) => {
  const { category } = req.body;
  // 여기서 세션으로부터 userId와 nickname을 가져옵니다.
  const userId = req.session.passport.user[0].id;

  try {
    const checkSql = "SELECT gptCount FROM users WHERE id = ?";
    const [results] = await db.query(checkSql, userId);
    const gptCount = results[0].gptCount;
    res.status(200).json({ content: gptCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

router.post("/", isLoggedIn, async (req, res) => {
  const { content } = req.body;
  const userId = req.session.passport.user[0].id;

  try {
    const checkSql = "SELECT gptCount FROM users WHERE id = ?";
    const [results] = await db.query(checkSql, userId);
    if (results[0].gptCount <= 0)
      return res
        .status(400)
        .json({ message: "gpt 사용 횟수를 모두 사용하였습니다." });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "다음 내용들을 회사에 지원을 할때 제출할 자기소개서 형식에 맞춰서 500 글자로 정리해줘",
        },
        {
          role: "user",
          content: `${content}`,
        },
      ],
      temperature: 1,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const result = completion.choices[0].message.content;
    console.log("gpt 결과 : ", result);

    try {
      const [results] = await db.query(
        "UPDATE users SET gptCount = gptCount - 1 WHERE id = ?",
        [userId]
      );
      res.status(200).json({ content: result });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "db 오류 발생." });
    }
  } catch (error) {
    console.error("Error fetching response:", error);
    return res.status(500).json({ message: error });
  }
});

module.exports = router;
