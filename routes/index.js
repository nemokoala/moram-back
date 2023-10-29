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
const passport = require("../config/passport");
const session = require("express-session");
const userRoutes = require("./user");
const postingRoutes = require("./posting");
const commentRoutes = require("./comment");
const adminRoutes = require("./admin");
const { authenticateUser } = require("../config/middleware");
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(
  session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use("/user", userRoutes);
app.use("/posting", postingRoutes);
app.use("/comment", commentRoutes);
app.use("/like", likeRoutes);
app.use("/admin", adminRoutes);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/hi", (req, res) => {
  res.status(200).send(`hello`);
});

app.post("/data", (req, res) => {
  const { id, password } = req.body;
  console.log(`Data id : ${id} password : ${password}`);
  res.status(200).send(`id:${id}, password:${password}`);
});

// app.post("/chat", async (req, res) => {
//   const { content } = req.body;
//   const user = req.user;
//   if (user.gptCount <= 0)
//     return res.status(500).send("AI 생성 횟수를 모두 사용하셨습니다.");

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         {
//           role: "system",
//           content:
//             "다음 내용들을 회사에 지원을 할때 제출할 자소서 형식에 맞춰서 1000토큰 내로 정리해줘",
//         },
//         {
//           role: "user",
//           content: `${content}`,
//         },
//       ],
//       temperature: 1,
//       max_tokens: 1000,
//       top_p: 1,
//       frequency_penalty: 0,
//       presence_penalty: 0,
//     });

//     const result = completion.choices[0].message.content;
//     console.log(result);

//     try {
//       const [results] = await db.query(
//         "UPDATE users SET gptCount = gptCount - 1 WHERE id = ?",
//         [user.id]
//       );
//       res.status(200).send(result);
//     } catch (error) {
//       console.error(error);
//       return res.status(500).send("db 오류 발생.");
//     }
//   } catch (error) {
//     console.error("Error fetching response:", error);
//   }
// });

app.listen(PORT, () => {
  console.log("Server is running");
});
