module.exports = function (app) {
    app.get("/room/getName", async function (req, res) {
        var io = req.app.get('io');
        var db = req.app.get('db');
        let rooms = await db
          .collection("Room")
          .find({ _id: req.cookies.room })
          .toArray()
          .then((data) => {
            res.send(data);
          });
      });
      
}