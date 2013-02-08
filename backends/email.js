var nodemailer = require("nodemailer");
var sendmail = nodemailer.createTransport("Sendmail");
exports.sendMessage = function(user, from, to, message) {
    sendmail.sendMail({
        from: "Noddy <noddy@digitalwindow.com>",
        to: user.email.email,
        subject: 'IRC: ' + from +' in '+to,
        text: message
    });
}