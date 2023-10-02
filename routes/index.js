const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const db = require("../config/db");
const cors = require("cors");
const app = express();
const PORT = 8000;
const openai = require("../config/chatgpt");
const ejs = require("ejs");
const path = require("path");

const userRoutes = require("./user");
const postingRoutes = require("./posting");
const commentRoutes = require("./comment");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use("/user", userRoutes);
app.use("/posting", postingRoutes);
app.use("/comment", commentRoutes);

app.use(express.json());
app.use(cors());

app.get("/hi", (req, res) => {
  res.status(200).send(`hello`);
});

app.post("/data", (req, res) => {
  const { id, password } = req.body;
  console.log(`Data id : ${id} password : ${password}`);
  res.status(200).send(`id:${id}, password:${password}`);
});

app.get("/posting/all", async (req, res) => {
  try {
    const [results, fields] = await db.query("select * from posting");
    res.send(results);
    console.log(results);
  } catch (error) {
    console.error(error);
    res.status(500).send("db 오류 발생.");
  }
});

app.post("/posting/add", async (req, res) => {
  const { title, content } = req.body;
  try {
    const [results] = await db.query(
      "INSERT INTO posting (title, content) VALUES (?, ?)",
      [title, content]
    );
    res.status(200).send("게시물을 성공적으로 작성했습니다.");
  } catch (error) {
    console.error(error);
    res.status(500).send("db 오류 발생.");
  }
});

app.post("/chat", async (req, res) => {
  const { content } = req.body;
  let conversationHistory = [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "다음 내용들을 자소서 형식에 맞춰서 작성해줘",
        },
        {
          role: "user",
          content: `${content}`,
        },
      ],
      temperature: 1,
      max_tokens: 100,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const result = completion.choices[0].message.content;
    console.log(result);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error fetching response:", error);
  }
});

app.get("/test", (req, res) => {
  console.log(process.env.PORT);
  console.log(process.env.KAKAO_ID);
});

app.listen(PORT, () => {
  console.log("Server is running");
});

//테스트
//lyej
