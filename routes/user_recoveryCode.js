module.exports = function (app) {

    app.all("/user/recovery-code", async function (req, res) {
        
        var io = req.app.get("io");
        var db = req.app.get("db");
        var session = req.app.get("session");
        var functions = req.app.get("functions");

        let userData = await User.findOne({ email: session.mail });
      
        if (userData) {
          if (await checkHash(req.body.code, userData.code)) {
            return res.send({
              status: 200,
              message: "Wpisano poprawny kod, wpisz nowe hasło.",
            });
          } else {
            return res.send({
              status: 500,
              message: "Podany kod nie jest poprawny, spróbuj ponownie.",
            });
          }
        }
      });

}