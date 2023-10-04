const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isLoggedIn } = require("../config/middleware");

router.get("/test", (req, res) => {
  res.send("test");
  console.log(req.session.passport);
});

// 과 게시글 조회
router.get("/", async (req, res) => {
  try {
    const titleSql = "SELECT id, title, nickname, writeTime, hitCount, likesCount FROM postings WHERE category = ? ";
    const [results] = await db.query(titleSql, [req.query.category]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "서버 오류입니다." });
    console.error(error);
  }
});

// 특정 게시글 조회
router.get("/:id", async (req, res) => {
  try {
    const postingSql = "SELECT * FROM postings WHERE id = ?"
    const [results] = await db.query( postingSql, [req.params.id] );
    if (results.length === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    res.json(results[0]);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 새로운 게시글 추가 
router.post("/add", isLoggedIn , async (req, res) => {
  const { title,content,img1Url,img2Url,img3Url,
          category ,tag } = req.body;

  // 여기서 세션으로부터 userId와 nickname을 가져옵니다.
  const { userId, nickname } = req.session.passport.user;

  try {
    const addSql ="INSERT INTO postings (userId,nickname ,writeTime ,updateTime,title,content,img1Url,img2Url,img3Url,\
      category ,tag) VALUES (?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?)"
    const [results] = await db.query( addSql, [userId,nickname,title,content,img1Url,img2Url,img3Url,category ,tag]);
    res.status(201).json({ message: "게시물 작성이 완료되었습니다." });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});


// 특정 게시글 업데이트
router.put("/update/:id", isLoggedIn , async (req, res) => {
  const { userId, nickname, writeTime, updateTime,
          title,content,img1Url,img2Url,img3Url,
          likesCount,hitCount ,category ,tag } = req.body;
  
  try {
    const updateSql = "UPDATE postings SET userId=?, nickname=?, writeTime=?, updateTime=?, title=?, content=?, img1Url=?, img2Url=?, img3Url=?,\
    likesCount=? ,hitCount=? ,category=? ,tag=? WHERE id = ?"
    const [results] = await db.query( updateSql, [userId,nickname ,writeTime ,updateTime,title,content,img1Url,img2Url,img3Url,
        likesCount,hitCount ,category ,tag, req.params.id]);
    
    if (results.affectedRows === 0) { //length성능차이 있는지
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }
    
    res.json({ message: "게시물이 수정되었습니다." });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 특정 게시글 삭제 //user 인증 기능 하면 추가.
router.delete("/delete/:id", isLoggedIn , async(req,res)=>{
   try {
     const deleteSql = "DELETE FROM postings WHERE id = ?"
     const [results] = await db.query( deleteSql, [req.params.id]);
     
     if (results.affectedRows === 0) {
       return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
     }

     res.json({ message: "게시물이 삭제되었습니다." });

   } catch(error){
     console.error(error);
     res.status(500).json({message:"서버 오류입니다."});
   }
});

module.exports = router;
