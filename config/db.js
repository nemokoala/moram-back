const mysql = require("mysql2/promise");
// 데이터베이스 연결 정보 설정
const db = mysql.createPool({
  host: "svc.sel5.cloudtype.app", // MySQL 서버 호스트 이름 또는 IP 주소
  port: 31760, // MySQL 서버 포트 번호
  user: "root", // MySQL 사용자 이름
  password: "wkumoram", // MySQL 사용자 비밀번호
  database: "moram", // 사용할 데이터베이스 이름
});

module.exports = db;
