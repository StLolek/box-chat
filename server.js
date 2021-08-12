const mongoose = require("mongoose");
const path = require("path");
const http = require("http").Server;
const express = require("express");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const redis = require("redis");
const session = require("express-session");
const nodemailer = require("nodemailer");
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
var Schema = mongoose.Schema;

db.on("connected", () => {
  console.log("Połączono z MongoDB Atlas");
});

var User = db.collection("User");
const serverRedis = new RedisServer({
  port: process.env.REDIS_PORT,
  bin: "/usr/local/bin/redis-server",
});

let redisClient
if(process.env.REDISCLOUD_URL){
    redisClient = redis.createClient(process.env.REDIS_PORT, "127.0.0.1");
} else {
    redisClient = redis.createClient()
}

var RedisStore = require("connect-redis")(session);

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
  secret: "gBpwmwE0PmyDKPhhmY8CONJQW3TnCujQuoE8nVao",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true },
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

app.get("/", function (req, res) {
  req.session; // Session object in a normal request
});

app.get("/getrooms", async function (req, res) {
  let rooms = await db
    .collection("Room")
    .find()
    .toArray()
    .then(async function(data){

      for(var i = 0; i<data.length; i++){
        var count = 0;
        const sockets = await io.fetchSockets();
        for (const socket of sockets) {
          if (socket.rooms.has(data[i]._id)) {
            count++;
          }
        }
        data[i]['count'] = count;
      }
      return res.send(data);      
    });
});

app.get("/getalluserscount", async function(req, res){
  var data = [];
  data.push (io.engine.clientsCount);
  return res.send(data) ;
})

app.get("/getroomname", async function (req, res) {
  let rooms = await db
    .collection("Room")
    .find({ _id: req.cookies.room })
    .toArray()
    .then((data) => {
      res.send(data);
    });
});

app.get("/addroom", async function (req, res) {
  let rooms = await db
    .collection("Room")
    .find({ _id: session.room })
    .toArray()
    .then((data) => {
      res.send(data);
    });
});

app.all("/room/join", async function (req, res) {
  session.room = req.body.rooms;

  res.cookie("room", session.room, { httpOnly: false, encode: String });
  res.redirect("/czat.html");
});

app.all("/user/login", async function (req, res) {
  if (!validateEmail(req.body.username)) {
    var userData = await User.findOne({ username: req.body.username });
  } else {
    var userData = await User.findOne({ email: req.body.username });
  }

  if (userData) {
    if (await checkHash(req.body.password, userData.password)) {
      session.username = req.body.username;
      res.cookie("username", session.username, { httpOnly: false });
      return res.send({ status: 200, message: "Zalogowano pomyślnie" });
    } else {
      return res.send({
        status: 500,
        message: "Login bądź hasło nie jest poprawne",
      });
    }
  } else {
    return res.send({
      status: 500,
      message: "Login bądź hasło nie jest poprawne",
    });
  }
  // res.cookie('room', session.room, { httpOnly: false });
});

app.all("/user/register", async function (req, res) {
  data = {};
  if (req.body.captcha === session.captcha) {
    let count = await User.countDocuments({ username: req.body.username });
    if (count > 0) {
      return res.send({ status: 500, message: "Wpisany login jest zajęty." });
    } else {
      data["username"] = req.body.username;
    }
    if (req.body.email === "") {
    } else {
      let count = User.countDocuments({ email: req.body.email });
      if (count > 0) {
        return res.send({ status: 500, message: "Wpisany email jest zajęty" });
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
      } else if (req.body.password.length > 5) {
        return res.send({
          status: 500,
          message: "Hasło musi składać się z conajmniej 6 znaków.",
        });
      }
    }
    User.insertOne(data);
    return res.send({
      status: 200,
      message: "Konto zostało założone poprawnie, teraz się zaloguj",
    });
  } else {
    res.send({ status: 500, message: "Wpisano błędną captchę." });
  }
});

app.all("/user/recovery", async function (req, res) {
  if (req.body.captcha == session.captcha) {
    session.mail = req.body.email;
    let count = await User.countDocuments({ email: session.mail });
    if (count > 0) {
      let code = Math.floor(100000 + Math.random() * 900000);
      const update = await User.updateOne(
        { email: session.mail },
        { $set: { code: hash(code.toString()) } }
      );
      let info = await mailer.sendMail({
        from: '"Box 📦 Chat " <boxchat@yopmail.com>', // sender address
        to: session.mail, // list of receivers
        subject: "BOXCHAT - RESETOWANIE HASŁA", // Subject line
        text: `Drogi użytkowniku, użyj podanego kodu, aby zrestartować hasło. KOD: ${code} `, // plain text body
        html: `<b>Drogi użytkowniku,</b><br>
        użyj podanego kodu, aby zrestartować hasło.<br><br>
        <b>KOD: <span style="color:red">${code}</span></b><br><br>
        Pozdrawiam,<br>
        BoxChat Bot 😀`, // html body
      });
      return res.send({
        status: 200,
        message: "Wysłano kod do resetowania hasła, sprawdź swój mail.",
      });
    } else {
      return res.send({
        status: 500,
        message: "Do podanego maila nie ma przypisanego maila.",
      });
    }
  } else {
    return res.send({ status: 500, message: "Wpisano błędną captchę." });
  }
});

app.all("/user/recovery-code", async function (req, res) {
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

app.all("/user/change-password", async function (req, res) {
  if (req.body.password == req.body.confirmPassword) {
    const update = await User.updateOne(
      { email: session.mail },
      { $set: { password: hash(req.body.password) } }
    );
    console.log("zmieniam hasło");
  }
  res.send({ status: 200, message: "Pomyślnie zmieniono hasło" });
});

app.all("/guest-login", function (req, res) {
  if (req.body.captcha == session.captcha) {
    res.cookie("username", req.body.username, { httpOnly: false });
    res.redirect("/rooms.html");
  } else {
    res.send({ status: 500, message: "Wpisano błędną captchę." });
  }
});

app.get("/captcha", function (req, res) {
  var captcha = require("nodejs-captcha");
  const height = 50;
  var newCaptcha = captcha({ height: height });
  var imagebase64 = newCaptcha.image;
  session.captcha = newCaptcha.value;
  res.send(imagebase64);
});

function hash(word) {
  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds);
  return bcrypt.hashSync(word, salt);
}

function checkHash(word, hashedWord) {
  return bcrypt.compare(word, hashedWord);
}

function validateEmail(emailAdress) {
  let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (emailAdress.match(regexEmail)) {
    return true;
  } else {
    return false;
  }
}

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
