const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const db = require("../config/db");
const cors = require("cors");
const app = express();
const PORT = 8000;
const ejs = require("ejs");
const path = require("path");
const passport = require("../config/passport");
const session = require("express-session");
const userRoutes = require("./user");
const registerRoutes = require("./register");
const loginRoutes = require("./login");
const postingRoutes = require("./posting");
const commentRoutes = require("./comment");
const adminRoutes = require("./admin");
const noticeRoutes = require("./notice");
const likeRoutes = require("./like");
const profileRoutes = require("./profile");
const bookmarkRoutes = require("./bookmark");
const gptRoutes = require("./gpt");
const { authenticateUser, isAdmin } = require("../config/middleware");
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(
  session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
      //secure: true, // HTTPS를 통해서만 쿠키가 전송되도록 설정
      //ecure: true, // HTTPS를 통해서만 쿠키가 전송되도록 설정
      httpOnly: true, // 클라이언트 JavaScript가 쿠키를 접근하지 못하도록 설정
      sameSite: "none",
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use("/user", userRoutes);
app.use("/posting", postingRoutes);
app.use("/comment", commentRoutes);
app.use("/like", likeRoutes);
app.use("/admin", isAdmin, adminRoutes);
app.use("/register", registerRoutes);
app.use("/login", loginRoutes);
app.use("/profile", profileRoutes);
app.use("/notice", noticeRoutes);
app.use("/bookmark", bookmarkRoutes);
app.use("/gpt", gptRoutes);

app.get("/", (req, res) => {
  res.status(200).send(`Server is on`);
});

app.listen(PORT, () => {
  console.log("Server is running");
});
