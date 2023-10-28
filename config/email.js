const dotenv = require("dotenv");
const nodemailer = require("nodemailer");

const smtpTransport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  auth: {
    user: "c1004sos1@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = smtpTransport;
