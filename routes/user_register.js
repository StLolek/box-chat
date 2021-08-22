module.exports = function (app) {
  app.all("/user/register", async function (req, res) {
    var io = req.app.get("io");
    var db = req.app.get("db");
    var session = req.app.get("session");
    var functions = req.app.get("functions");

    data = {};
    if (req.body.captcha === session.captcha) {
      let count = await db.collection('User').countDocuments({ username: req.body.username });
      if (count > 0) {
        return res.send({ status: 500, message: "Wpisany login jest zajęty." });
      } else {
        data["username"] = req.body.username;
      }
      if (req.body.email === "") {
      } else {
        let count = db.collection('User').countDocuments({ email: req.body.email });
        if (count > 0) {
          return res.send({
            status: 500,
            message: "Wpisany email jest zajęty",
          });
        } else {
          data["email"] = req.body.email;
        }
      }
      if (
        req.body.password == req.body.confirmPassword &&
        req.body.password.length > 5
      ) {
        data["password"] = hash(req.body.password);
      } else {
        if (req.body.password != req.body.confirmPassword) {
          return res.send({
            status: 500,
            message: "Wpisane hasła nie są takie same.",
          });
        }
        if (req.body.password.length <= 5) {
          return res.send({
            status: 500,
            message: "Hasło musi składać się z conajmniej 6 znaków.",
          });
        }
      }
      console.log(req.body.password.length);
      db.collection('User').insertOne(data);
      return res.send({
        status: 200,
        message: "Konto zostało założone poprawnie, teraz się zaloguj",
      });
    } else {
      res.send({ status: 500, message: "Wpisano błędną captchę." });
    }
  });
};
