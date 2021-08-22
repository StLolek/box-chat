module.exports = function (app) {
    app.all("/user/change-password", async function (req, res) {

        var io = req.app.get("io");
        var db = req.app.get("db");
        var session = req.app.get("session");
        var functions = req.app.get("functions");

        if (req.body.password == req.body.confirmPassword) {
          const update = await db.collection("User").updateOne(
            { email: session.mail },
            { $set: { password: hash(req.body.password) } }
          );
          console.log("zmieniam hasło");
        }
        res.send({ status: 200, message: "Pomyślnie zmieniono hasło" });
      });
      
}