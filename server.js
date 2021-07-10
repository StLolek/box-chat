const url = "mongodb+srv://User:Password123@boxchat.hq5c9.mongodb.net/BoxChat?retryWrites=true&w=majority";
const mongoose = require('mongoose');
const path = require("path");
const http = require("http").Server;
const express = require("express");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const redis = require('redis');
const session = require('express-session');



const RedisServer = require('redis-server');


const formatMessage = require("./utils/messages");


const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const connect = mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
var db = mongoose.connection;
var Schema = mongoose.Schema;

db.on('connected', () => {
  console.log('Połączono z MongoDB Atlas')
})

const serverRedis = new RedisServer({
  port: 6379,
  bin: '/usr/local/bin/redis-server'
});
var redisClient = redis.createClient(6379, 'localhost');
var RedisStore = require('connect-redis')(session);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
const server = http(app);
const io = socketio(server);
const bot = "BOT";

redisClient.on("error", function (err) {
  console.log(" Error " + err);
});

var sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: 'gBpwmwE0PmyDKPhhmY8CONJQW3TnCujQuoE8nVao',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
});

io.use(function (socket, next) {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

app.use(sessionMiddleware);

io.on("connection", function (socket) {

  // userdata = {
  //   "userid": socket.id,
  //   "username": session.username,
  //   "room": session.room
  // };

  // userid = socket.id;
  // username = session.username;
  // socket.request.session.username = username;
  // room = session.room;
  // socket.request.session.room = room;


  // socket.request.session;

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    socket.emit("msg", formatMessage(bot, "Witaj w BoxChat!")); // napisac u wchodzacej osoby

    socket.broadcast
      .to(user.room)
      .emit("msg", formatMessage(bot, `${user.username} dołączył do czatu!`)); // napisać wszystkim poza wchodzaca osoba

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });

    io.to(user.room).emit('roomUsersCount', {
      usersCount: getRoomUsers(user.room)
    });
  });

  // io.emit('msg', ) // napisac kazdemu

  socket.on("chatMessage", (message) => {

    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("msg", formatMessage(user.username, message));
  });

  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
    socket.request.session.destroy();
    if (user) {
      io.to(user.room).emit("msg", formatMessage(bot, `${user.username} opuścił czat!`));
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

app.get("/", function (req, res) {
  req.session // Session object in a normal request
});

app.get("/getrooms", async function (req, res) {

  let rooms = await db.collection('Room').find().toArray().then((data) => {
    session.room = data[0].name;
    res.send(data);
  });
});

app.get("/getroomname", async function (req, res) {
  let rooms = await db.collection('Room').find({ _id: req.cookies.room }).toArray().then((data) => {
    res.send(data);
  });
});

app.get("/addroom", async function (req, res) {
  let rooms = await db.collection('Room').find({ _id: session.room }).toArray().then((data) => {
    res.send(data);
  });
});

app.all('/room/join', async function (req, res) {
  session.room = req.body.rooms;

  res.cookie('room', session.room, { httpOnly: false, encode: String });
  res.redirect('/czat.html');
})

app.all('/user/login', function (req, res) {
  session.username = req.body.username;
  session.room = req.body.rooms;
  if (req.body.remember) {
    res.cookie('rememberme', 'yes', { expires: 0, httpOnly: true });
  }
  res.cookie('username', session.username, { httpOnly: false });
  res.cookie('room', session.room, { httpOnly: false });
  res.redirect('/czat.html');
})

app.all('/user/register', async function (req, res) {
  data = {};
  if (req.body.captcha === session.captcha) {
    let count = await db.collection('User').countDocuments({ username: req.body.username });
    if (count > 0) {
      res.send('Wpisany login jest zajęty.');
      return;
    } else {
      data['username'] = req.body.username;
    }
    if (req.body.email === '') {
    } else {
      let count = db.collection('User').countDocuments({ email: req.body.email });
      if (count > 0) {
        res.send('Wpisany email jest zajęty');
      } else {
        data['email'] = req.body.email;
      }
    }
    if (req.body.password == req.body.confirmPassword && req.body.password.length > 5){
      data['password'] = hashPassword(req.body.password);
    } else {
      if(req.body.password != req.body.confirmPassword){
        res.send('Wpisane hasła nie są takie same.');
      } else if(req.body.password.length > 5){
        res.send('Hasło musi mieć minimum 6 znaków');
      }
    }

    db.collection('User').insertOne(data);
    res.redirect('/');
  }
})

app.all('/guest-login', function (req, res) {
  if (req.body.captcha == session.captcha) {
    res.cookie('username', req.body.username, { httpOnly: false });
    res.redirect('/rooms.html');
  } else {
    res.send('error');
  }

})

app.get('/captcha', function (req, res) {
  var captcha = require("nodejs-captcha");
  const height = 50;
  var newCaptcha = captcha({ height: height });
  var imagebase64 = newCaptcha.image;
  session.captcha = newCaptcha.value;
  res.send(imagebase64);
});

function hashPassword(password) {
  const salt = bcrypt.genSaltSync(saltRounds);
  return bcrypt.hashSync(password, salt);
}

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
