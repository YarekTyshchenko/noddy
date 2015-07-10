var Slack = require('slack-client');

module.exports = function() {
    this.name = 'Slack';
    var token = this.getConfigVar("token");
    var relayChannel = "test";
    var say = this.noddy.say;

    var slack;
    var sendMessage = function(from, message) {
        if (!slack) return;
        if (!slack.connected) return;
        var c = slack.getChannelByName(relayChannel);
        c.postMessage({text: message, username:from});
    }

    var onOpen = function(){
        console.log('Welcome to Slack. You are ' + slack.self.name + ' of ' + slack.team.name);
    };

    var onMessage = function(message) {
        var channel = slack.getChannelGroupOrDMByID(message.channel);
        var user = slack.getUserByID(message.user);
        if (!user) return; // Don't trigger on non-existing users
        if (message.subtype === 'bot_message') return; // Don't trigger on bot messages

        if (message.type === 'message' && channel.name == relayChannel) {
            var trimmedMessage = message.text.trim();
            say('#' + relayChannel, user.name + ': ' + trimmedMessage);
        }
    };

    var onError = function(e) {
        console.log(e);
        console.log(e.stack);
    }

    this.init = function(payload) {
        if (payload) {
            slack = payload.slack;
        } else {
            slack = new Slack(token, true, true);
            slack.on('open', onOpen);
            slack.on('error', onError);
            slack.on('message', onMessage);
            slack.login();
        }
    }

    this.destroy = function() {
        return {
            slack: slack
        }
    }
     
    this.events = {
        message: function(from, channel, message) {
            if (channel.toLowerCase() == "#" + relayChannel) {
                sendMessage(from, message);
            }
        }
    }
}

