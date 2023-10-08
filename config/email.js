const nodemailer = require("nodemailer");

const smtpTransport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  auth: {
    user: "c1004sos1@gmail.com",
    pass: "lqqa msan zxyd rgdk",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = smtpTransport;
