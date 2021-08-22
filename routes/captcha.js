module.exports = function (app) {
  app.get("/captcha", function (req, res) {
    var captcha = require("nodejs-captcha");
    const height = 50;
    var newCaptcha = captcha({ height: height });
    var imagebase64 = newCaptcha.image;
    session.captcha = newCaptcha.value;
    res.send(imagebase64);
  });
};
