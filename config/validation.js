// Email 유효성 검사 함수, 형식에 맞으면 true 리턴 틀리면 false 리턴
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (email.length > 50) {
    return false;
  }
  return emailRegex.test(email);
};
// password 유효성 검사 함수, 형식에 맞으면 true 리턴 틀리면 false 리턴
const validatePassword = (password) => {
  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (password.length > 50) {
    return false;
  }
  return passwordRegex.test(password);
};
// nickname 유호성 검사 함수, 형식에 맞으면 true 리턴 틀리면 false 리턴
const validateNickname = (nickname) => {
  const regex = /^[a-zA-Z0-9가-힣]{2,16}$/;
  if (nickname.length > 50) {
    return false;
  }

  return regex.test(nickname);
};

exports.validateEmail = validateEmail;
exports.validatePassword = validatePassword;
exports.validateNickname = validateNickname;
