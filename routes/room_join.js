module.exports = function (app) {
    app.all("/room/join", async function (req, res) {
        res.cookie("room", req.body.rooms, { httpOnly: false, encode: String });
        res.redirect("/czat.html");
    });
  };
  