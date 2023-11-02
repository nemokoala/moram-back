const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isLoggedIn } = require("../config/middleware");

router.get("/test", (req, res) => {
  res.send("test");
  console.log(req.session.passport);
});

router.get("/", async (req, res) => {
  try {
    let { category, tag, lastId } = req.query;
    let titleSql =
      "SELECT id, userId, title, nickname, writeTime, hitCount, likesCount, tag, category FROM postings";
    let queryParams = [];

    if (category || tag || lastId) {
      let conditions = [];

      if (category) {
        conditions.push("category = ?");
        queryParams.push(category);
      }

      if (tag) {
        conditions.push("tag = ?");
        queryParams.push(tag);
      }

      if (lastId) {
        conditions.push("id < ?");
        queryParams.push(lastId);
      }

      titleSql += " WHERE " + conditions.join(" AND ");
    }

    // 작성 시간을 기준으로 내림차순 정렬
    titleSql += " ORDER BY writeTime DESC";

    // 최근에 써진 글 5개만 가져오기
    titleSql += " LIMIT 5";

    const [results] = await db.query(titleSql, queryParams);
    return res.json(results);
  } catch (error) {
    res.status(500).json({ message: "서버 오류입니다." });
    console.error(error);
  }
});

// 특정 게시글 조회
router.get("/:id", async (req, res) => {
  try {
    const postingSql = "SELECT * FROM postings WHERE id = ?";
    const [results] = await db.query(postingSql, [req.params.id]);
    if (results.length === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }
    // 조회수 증가
    const updateHitCountSql =
      "UPDATE postings SET hitCount = hitCount + 1 WHERE id = ?";
    await db.query(updateHitCountSql, [req.params.id]);

    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 새로운 게시글 추가
router.post("/", isLoggedIn, async (req, res) => {
  const { title, content, img1Url, img2Url, img3Url, category, tag } = req.body;
  // 여기서 세션으로부터 userId와 nickname을 가져옵니다.
  console.log("포스트", req.session.passport);
  const { nickname } = req.session.passport.user[0];
  const userId = req.session.passport.user[0].id;

  try {
    const addSql =
      "INSERT INTO postings (userId, nickname, writeTime, updateTime, title, content, img1Url, img2Url, img3Url, category, tag)\
     VALUES (?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?)";

    // 물음표에 해당하는 값들을 배열로 전달
    const values = [
      userId,
      nickname,
      title,
      content,
      img1Url,
      img2Url,
      img3Url,
      category,
      tag,
    ];
    const [results] = await db.query(addSql, values);
    res.status(201).json({ message: "게시물 작성이 완료되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 특정 게시글 업데이트
router.put("/:id", isLoggedIn, async (req, res) => {
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
    const updateSql =
      "UPDATE postings SET userId=?, nickname=?, writeTime=?, updateTime=?, title=?, content=?, img1Url=?, img2Url=?, img3Url=?,\
    likesCount=? ,hitCount=? ,category=? ,tag=? WHERE id = ?";
    const [results] = await db.query(updateSql, [
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
    ]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    res.json({ message: "게시물이 수정되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 특정 게시글 삭제
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    const deleteSql = "DELETE FROM postings WHERE id = ?";
    const [results] = await db.query(deleteSql, [req.params.id]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    res.json({ message: "게시물이 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

router.post("/report/:postId", isLoggedIn, async (req, res) => {
  try {
    const { nickname } = req.session.passport.user[0];
    const userId = req.session.passport.user[0].id; // 로그인한 사용자의 ID
    const { postId } = req.params; // 신고할 게시물의 ID
    const { reason, description } = req.body; // 신고 이유와 상세 설명
    const createTime = new Date(); // 신고 시간

    // 신고 정보를 데이터베이스에 저장하는 SQL 쿼리
    const reportSql =
      "INSERT INTO reports (userId, nickname, postId, reason, description, createTime) VALUES (?, ?, ?, ?, ?, ?)";

    // SQL 쿼리 실행
    await db.query(reportSql, [
      userId,
      nickname,
      postId,
      reason,
      description,
      createTime,
    ]);

    res.status(200).json({ message: "신고가 접수되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { keyword, page = 1 } = req.query; // 검색어와 페이지 번호를 받습니다. 페이지 번호가 없는 경우 기본값 1

    if (!keyword) {
      return res.status(400).json({ message: "검색어를 입력해주세요." }); // 검색어가 없는 경우 에러 메시지를 반환
    }

    // 검색어가 제목, 내용, 태그 중 어디에든 포함되어 있는 게시물을 찾는 SQL 쿼리
    // 검색 결과를 페이지 당 10개씩 제한, 페이지 번호에 따라 결과를 건너뛰는 LIMIT과 OFFSET을 사용
    const searchSql =
      "SELECT id, userId, title, nickname, writeTime, hitCount, likesCount, tag, category FROM postings \
      WHERE title LIKE ? OR content LIKE ? OR tag LIKE ? LIMIT 10 OFFSET ?";

    // SQL의 LIKE 연산자를 사용하여 검색어가 포함된 게시물 찾기
    // 검색어 앞뒤에 '%'를 붙여 검색어가 어디에든 포함된 경우를 찾을 수 있음
    // LIMIT과 OFFSET에 사용할 값을 계산하여 쿼리 파라미터에 추가
    const queryParams = [
      `%${keyword}%`,
      `%${keyword}%`,
      `%${keyword}%`,
      (page - 1) * 10,
    ];

    const [results] = await db.query(searchSql, queryParams);

    if (results.length === 0) {
      return res.status(404).json({ message: "검색 결과가 없습니다." }); // 검색 결과가 없는 경우 에러 메시지 반환
    }

    res.json(results); // 검색 결과 반환
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

module.exports = router;

//gittest
