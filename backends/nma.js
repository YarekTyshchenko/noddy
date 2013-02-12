var request = require('request');

exports.sendMessage = function(user, from, to, message) {
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
exports.verifyConfig = function(config, errorCallback) {
    if (! config.nma.apikey) {
        errorCallback('No API Key provided');
        return false;
    }
    return true;
}