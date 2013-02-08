var nodemailer = require("nodemailer");
var sendmail = nodemailer.createTransport("Sendmail");
exports.sendMessage = function(user, message) {
    sendmail.sendMail({
        from: "noddy@digitalwindow.com",
        to: user.email.email,
        subject: 'IRC Noddification',
        text: message
    });
}