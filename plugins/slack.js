var _ = require('underscore');
var Slack = require('slack-client');

module.exports = function() {
    this.name = 'Slack';
    var token = this.getConfigVar("token");
    var relayChannel = this.getConfigVar("relayChannel");
    var say = this.noddy.say;

    var slack;
    var sendMessage = function(_slack, from, message) {
        if (!_slack) return;
        if (!_slack.connected) return;
        var c = _slack.getChannelByName(relayChannel);
        c.postMessage({text: message, username:from});
    }

    var onOpen = function(){
        console.log('Welcome to Slack. You are ' + this.self.name + ' of ' + this.team.name);
    };

    var onMessage = function(message) {
        var channel = this.getChannelGroupOrDMByID(message.channel);
        var user = this.getUserByID(message.user);
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

    var initSlack = function(token) {
        _slack = new Slack(token, true, true);
        _slack.on('open', onOpen);
        _slack.on('error', onError);
        _slack.on('message', onMessage);
        _slack.login();
        return _slack;
    }

    this.init = function(payload) {
        if (payload) {
            slack = payload.slack;
        } else {
            slack = initSlack(token);
            relays = {};
        }
    }

    this.destroy = function() {
        return {
            slack: slack
        }
    }
     
    this.events = {
        message: function(from, channel, message) {
            if (message.indexOf("!") == 0) return; // Ignore commands
            if (channel.toLowerCase() == "#" + relayChannel) {
                sendMessage(slack, from, message);
            }
        }
    }
}

