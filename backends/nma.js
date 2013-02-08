var request = require('request');

exports.sendMessage = function(user, message) {
    request.post(
        'https://www.notifymyandroid.com/publicapi/notify',
        {
            form: {
                apikey: user.nma.apikey,
                application: "IRC",
                event: 'Mention',
                description: message
            }
        }
    );
}