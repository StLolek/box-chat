const bcrypt = require("bcrypt");


module.exports.hash = (word) => {
  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds);
  return bcrypt.hashSync(word, salt);
};

module.exports.checkHash = (word, hashedWord) => {
    return bcrypt.compare(word, hashedWord);

}

module.exports.validateEmail = (emailAdress) =>  {
    let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (emailAdress.match(regexEmail)) {
      return true;
    } else {
      return false;
    }
}

