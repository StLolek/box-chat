module.exports = function (app) {
    app.get("/user/getAllCount", async function(req, res){
        var io = req.app.get('io');
        var data = [];
        data.push (io.engine.clientsCount);
        return res.send(data) ;
      })
}