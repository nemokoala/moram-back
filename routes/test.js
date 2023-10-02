const bcrypt = require("bcrypt");

const password = "1234";
hash = bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
});
