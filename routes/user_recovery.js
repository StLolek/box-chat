module.exports = function (app) {
  app.all("/user/recovery", async function (req, res) {

    var io = req.app.get("io");
    var db = req.app.get("db");
    var session = req.app.get("session");
    var functions = req.app.get("functions");
    
    if (req.body.captcha == session.captcha) {
      session.mail = req.body.email;
      let count = await db.collection('User').countDocuments({ email: session.mail });
      if (count > 0) {
        let code = Math.floor(100000 + Math.random() * 900000);
        const update = await db.collection('User').updateOne(
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
};
