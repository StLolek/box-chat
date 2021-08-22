const mongoose = require("mongoose");
const path = require("path");
const http = require("http").Server;
const express = require("express");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const redis = require("redis");
const session = require("express-session");
const nodemailer = require("nodemailer");
const functions = require("./utils/functions")
require("dotenv").config();
var mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const RedisServer = require("redis-server");

const formatMessage = require("./utils/messages");

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const connect = mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
var db = mongoose.connection;

db.on("connected", () => {
  console.log("Połączono z MongoDB Atlas");
});

const serverRedis = new RedisServer({
  port: process.env.REDIS_PORT,
  bin: "/usr/local/bin/redis-server",
});

let redisClient
if(process.env.REDIS_PORT){
    redisClient = redis.createClient(process.env.REDIS_PORT, "127.0.0.1");
} else {
    redisClient = redis.createClient()
}

var RedisStore = require("connect-redis")(session);
redisClient.on("error", function (err) {
  console.log(" Error " + err);
});

var sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: "gBpwmwE0PmyDKPhhmY8CONJQW3TnCujQuoE8nVao",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true },
});

const app = express();
const server = http(app);
const io = socketio(server);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(sessionMiddleware);
app.set('io', io);
app.set('db', db);
app.set('session', session );
app.set('functions', functions );
require('./routes')(app);
const bot = "BOT";


io.use(function (socket, next) {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});


io.on("connection", function (socket) {

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    socket.emit("msg", formatMessage(bot, "Witaj w BoxChat!")); // napisac u wchodzacej osoby

    socket.broadcast
      .to(user.room)
      .emit("msg", formatMessage(bot, `${user.username} dołączył do czatu!`)); // napisać wszystkim poza wchodzaca osoba

    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });

    io.to(user.room).emit("roomUsersCount", {
      usersCount: getRoomUsers(user.room),
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
      io.to(user.room).emit(
        "msg",
        formatMessage(bot, `${user.username} opuścił czat!`)
      );
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
