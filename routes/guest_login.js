module.exports = function (app) {
  app.all("/guest-login", function (req, res) {
    if (req.body.captcha == session.captcha) {
      res.cookie("username", req.body.username, { httpOnly: false });
      res.redirect("/rooms.html");
    } else {
      res.send({ status: 500, message: "Wpisano błędną captchę." });
    }
  });
};
