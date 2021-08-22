module.exports = function(app){

    app.get('/', function(req, res){
        req.session; // Session object in a normal request
    });
}
