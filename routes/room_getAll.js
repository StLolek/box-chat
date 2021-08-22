
module.exports = function (app) {
  app.get("/room/getAll", async function (req, res) {
    var io = req.app.get('io');
    var db = req.app.get('db');
    let rooms = await db
      .collection("Room")
      .find()
      .toArray()
      .then(async function (data) {
        for (var i = 0; i < data.length; i++) {
          var count = 0;
          const sockets = await io.fetchSockets();
          for (const socket of sockets) {
            if (socket.rooms.has(data[i]._id)) {
              count++;
            }
          }
          data[i]["count"] = count;
        }
        return res.send(data);
      });
  });
};
