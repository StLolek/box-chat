module.exports = function (app) {
  app.all("/user/login", async function (req, res) {
    var io = req.app.get("io");
    var db = req.app.get("db");
    var session = req.app.get("session");
    var functions = req.app.get("functions");
    
    if (!functions.validateEmail(req.body.username)) {
      var userData = await db.collection('User').findOne({ username: req.body.username });
    } else {
      var userData = await db.collection('User').findOne({ email: req.body.username });
    }
  
    if(req.body.password == ''){
      return res.send({
        status: 500,
        message: "Hasło nie może być puste",
      });
    }
    if (userData) {
      if (await functions.checkHash(req.body.password, userData.password)) {
        session.username = req.body.username;
        res.cookie("username", session.username, { httpOnly: false });
        return res.send({ status: 200, message: "Zalogowano pomyślnie" });
      } else {
        return res.send({
          status: 500,
          message: "Login bądź hasło nie jest poprawne",
        });
      }
    } else {
      return res.send({
        status: 500,
        message: "Login bądź hasło nie jest poprawne",
      });
    }
    // res.cookie('room', session.room, { httpOnly: false });
  })
};
