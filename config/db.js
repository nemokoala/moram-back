const mysql = require("mysql2/promise");
// 데이터베이스 연결 정보 설정
const db = mysql.createPool({
  host: process.env.DB_HOST, // MySQL 서버 호스트 이름 또는 IP 주소
  port: process.env.DB_PORT, // MySQL 서버 포트 번호
  user: process.env.DB_USER, // MySQL 사용자 이름
  password: process.env.DB_PASSWORD, // MySQL 사용자 비밀번호
  database: "moramDB", // 사용할 데이터베이스 이름
});

module.exports = db;
