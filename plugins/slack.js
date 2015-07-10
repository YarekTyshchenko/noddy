var Slack = require('slack-client');

module.exports = function() {
    this.name = 'Slack';
    var token = this.getConfigVar("token");

    var slack = new Slack(token, true, true);
    var sendMessage = function(){};
    slack.on('open', function () {
        //console.log(slack);

        var channels = Object.keys(slack.channels)
            .map(function (k) { return slack.channels[k]; })
            .filter(function (c) { return c.is_member; })
            .map(function (c) { return c.name; });
     
     
        console.log('Welcome to Slack. You are ' + slack.self.name + ' of ' + slack.team.name);
     
        if (channels.length > 0) {
            console.log('You are in: ' + channels.join(', '));
        }
        else {
            console.log('You are not in any channels.');
        }
    });

    slack.on('error', function(e) {
        console.log(e);
        console.log(e.stack);
    });

    var say = this.noddy.say;

    slack.on('message', function(message) {
        var channel = slack.getChannelGroupOrDMByID(message.channel);
        var user = slack.getUserByID(message.user);
        if (message.type === 'message' && channel.name == "gold") {
            var trimmedMessage = message.text.trim();
            say('#gold', user.name + ': ' + trimmedMessage);
        }
    });

    this.init = function(payload) {
        slack.login();
        sendMessage = function(from, message) {
            var c = slack.getChannelByName("gold");
            //console.log(c);
            //c.send(message);
            c.postMessage({text: message, username:from});
        }
    }
     
    this.events = {
        message: function(from, channel, message) {
            if (channel.toLowerCase() == "#gold") {
                console.log(from, channel, message);
                sendMessage(from, message);
            }
        }
    }
}

