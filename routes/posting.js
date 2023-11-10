const express = require("express");
const router = express.Router();
const db = require("../config/db");
const passport = require("../config/passport");
const { isLoggedIn } = require("../config/middleware");
const { categoryList, tagList } = require("../config/categorytagList");
const { getUploadUrls } = require("../config/aws");

/*router.get("/test", (req, res) => {
  res.send("test");
  console.log(req.session.passport);
});*/

router.get("/", async (req, res) => {
  try {
    let { category, tag, lastId, search } = req.query;
    let titleSql = "SELECT * FROM postings";
    let endIdSql = "SELECT id FROM postings";
    let queryParams = [];
    let conditions = [];
    if (category || tag || lastId || search) {
      if (category) {
        conditions.push("category = ?");
        queryParams.push(category);
      }

      if (tag) {
        conditions.push("tag = ?");
        queryParams.push(tag);
      }

      if (search) {
        conditions.push("(title LIKE ? or content LIKE ?)");
        queryParams.push(`%${search}%`);
        queryParams.push(`%${search}%`);
      }

      if (lastId) {
        conditions.push("id < ?");
        queryParams.push(Number(lastId));
      }

      titleSql += " WHERE " + conditions.join(" AND ");
      endIdSql += " WHERE " + conditions.join(" AND ");
    }

    // 작성 시간을 기준으로 내림차순 정렬
    titleSql += " ORDER BY id DESC";

    // 최근에 써진 글 7개만 가져오기
    titleSql += " LIMIT 7";
    endIdSql += " ORDER BY id ASC LIMIT 1";
    console.log("db sql", titleSql);
    const [results] = await db.query(titleSql, queryParams);
    //console.log(results);
    const [endId] = await db.query(endIdSql, queryParams);
    return res.json({
      content: {
        postings: results,
        endId: endId[0]?.id,
        lastId: results[results.length - 1]?.id || 99999,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류입니다." });
    console.error(error);
  }
});

// 특정 게시글 조회
router.get("/specific/:id", async (req, res) => {
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

    res.json({ content: results[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 새로운 게시글 추가
router.post("/", isLoggedIn, async (req, res) => {
  console.log("categorylist: ", categoryList);
  const { title, content, img1Url, img2Url, img3Url, category, tag } = req.body;
  console.log("키값: ", Object.keys(categoryList));
  console.log("밸류: ", Object.values(categoryList));
  console.log("Category:", category);
  console.log("Tag:", tag);

  // 카테고리와 태그 값이 유효한지 확인
  if (!category || tag === "")
    return res.status(400).json({ message: "학과, 태그를 모두 선택해주세요." });
  const uniqueCategory = Object.values(categoryList).find((categoryValue) => {
    return categoryValue.includes(category);
  });
  if (!uniqueCategory.includes(category)) {
    return res.status(400).json({ message: "유효하지 않은 카테고리입니다." });
  }
  const uniqueTag = tagList.find((tagValue) => {
    return tagValue.includes(tag);
  });
  if (!uniqueTag.includes(tag)) {
    return res.status(400).json({ message: "유효하지 않은 태그입니다." });
  }

  // 제목과 내용의 최소/최대 길이 검사
  // 클라이언트 측에서 500자 이상이면 서버요청 못하게 막을 수 있나
  const minTitleLength = 2;
  const maxTitleLength = 30;
  const minContentLength = 4;
  const maxContentLength = 500;

  if (title.length < minTitleLength || title.length > maxTitleLength) {
    return res.status(400).json({
      message: `제목은 ${minTitleLength}자 이상 ${maxTitleLength}자 이하로 입력해주세요.`,
    });
  }

  if (content.length < minContentLength || content.length > maxContentLength) {
    return res.status(400).json({
      message: `내용은 ${minContentLength}자 이상 ${maxContentLength}자 이하로 입력해주세요.`,
    });
  }

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
  const { title, content, img1Url, img2Url, img3Url, category, tag } = req.body;

  // 카테고리와 태그 값이 유효한지 확인
  if (!category || tag === "") {
    return res.status(400).json({ message: "학과, 태그를 모두 선택해주세요." });
  }

  const uniqueCategory = Object.values(categoryList).find((categoryValue) => {
    return categoryValue.includes(category);
  });

  if (!uniqueCategory || !uniqueCategory.includes(category)) {
    return res.status(400).json({ message: "유효하지 않은 카테고리입니다." });
  }

  const uniqueTag = tagList.find((tagValue) => {
    return tagValue.includes(tag);
  });

  if (!uniqueTag || !uniqueTag.includes(tag)) {
    return res.status(400).json({ message: "유효하지 않은 태그입니다." });
  }

  // 로그인한 사용자의 ID를 가져옵니다.
  const loginUserId = req.session.passport.user[0].id;

  try {
    // 먼저 해당 게시글의 작성자 ID를 조회합니다.
    const selectSql = "SELECT userId FROM postings WHERE id = ?";
    const [rows] = await db.query(selectSql, [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }
    // 게시글의 작성자가 로그인한 사용자가 아니라면 에러를 반환합니다.
    if (rows[0].userId !== loginUserId) {
      return res.status(403).json({ message: "게시물 수정 권한이 없습니다." });
    }

    // 게시글의 작성자가 확인되었으면 게시글을 수정합니다.
    const updateSql =
      "UPDATE postings SET title=?, content=?, img1Url=?, img2Url=?, img3Url=?, category=?, tag=?, updateTime=NOW() WHERE id = ?";
    const [results] = await db.query(updateSql, [
      req.body.title,
      req.body.content,
      req.body.img1Url,
      req.body.img2Url,
      req.body.img3Url,
      req.body.category,
      req.body.tag,
      req.params.id,
    ]);

    res.json({ message: "게시물이 수정되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 특정 게시글 삭제
router.delete("/:id", isLoggedIn, async (req, res) => {
  // 로그인한 사용자의 ID를 가져옵니다.
  const loginUserId = req.session.passport.user[0].id;

  try {
    // 먼저 해당 게시글의 작성자 ID를 조회합니다.
    const selectSql = "SELECT userId FROM postings WHERE id = ?";
    const [rows] = await db.query(selectSql, [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }
    // 게시글의 작성자가 로그인한 사용자가 아니라면 에러를 반환합니다.
    if (rows[0].userId !== loginUserId) {
      return res.status(403).json({ message: "게시물 삭제 권한이 없습니다." });
    }

    // 게시글의 작성자가 확인되었으면 게시글을 삭제합니다.
    const deleteSql = "DELETE FROM postings WHERE id = ?";
    const [results] = await db.query(deleteSql, [req.params.id]);

    res.json({ message: "게시물이 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

router.post("/report/:postId", isLoggedIn, async (req, res) => {
  console.log(req);

  try {
    const { nickname } = req.session.passport.user[0];
    const userId = Number(req.session.passport.user[0].id); // 로그인한 사용자의 ID
    const { postId } = Number(req.params); // 신고할 게시물의 ID
    const { reason, description } = req.body; // 신고 이유와 상세 설명
    const createTime = new Date(); // 신고 시간

    // 신고 정보를 데이터베이스에 저장하는 SQL 쿼리
    const reportSql =
      "INSERT INTO reports (userId, nickname, postId, reason, createTime) VALUES (?, ?, ?, ?, ?)";

    // SQL 쿼리 실행
    await db.query(reportSql, [
      userId,
      nickname,
      postId,
      reason,
      createTime,
    ]);

    res.status(200).json({ message: "신고가 접수되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

router.get("/popular", async (req, res) => {
  
  try {
    // 좋아요 수가 가장 많은 상위 3개 게시글을 선택하는 SQL 쿼리
    const popularSql = "SELECT * FROM postings ORDER BY likesCount DESC LIMIT 3";
    
    // SQL 쿼리 실행
    const [results] = await db.query(popularSql);

    // 결과 반환
    res.json({ content: results });
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
      WHERE title LIKE ? OR content LIKE ? LIMIT 10 OFFSET ?";

    // SQL의 LIKE 연산자를 사용하여 검색어가 포함된 게시물 찾기
    // 검색어 앞뒤에 '%'를 붙여 검색어가 어디에든 포함된 경우를 찾을 수 있음
    // LIMIT과 OFFSET에 사용할 값을 계산하여 쿼리 파라미터에 추가
    const queryParams = [`%${keyword}%`, `%${keyword}%`, (page - 1) * 10];

    const [results] = await db.query(searchSql, queryParams);

    if (results.length === 0) {
      return res.status(404).json({ message: "검색 결과가 없습니다." }); // 검색 결과가 없는 경우 에러 메시지 반환
    }

    res.json({ content: results }); // 검색 결과 반환
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

router.get("/imgurl", isLoggedIn, getUploadUrls, async (req, res) => {
  try {
    uploadData = req.uploadData;
    if (uploadData) {
      return res.status(200).json({ content: uploadData });
    }
  } catch (error) {
    res.status(500).json({ message: "서버 오류입니다." });
    console.error(error);
  }
});

module.exports = router;
