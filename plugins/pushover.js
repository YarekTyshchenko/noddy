var _ = require('underscore');

module.exports = function() {
    this.name = 'Pushover';
    var _db = this.loadBase('pushover', {});
    var l = this.noddy.log;
    var push = require('pushover-notifications');
    var token = this.noddy.getConfig().plugins.pushover.token;
    var enabled = true;
    if (! token) {
        l("Token for pushover not specified");
        enabled = false;
    }
    var p = new push( {
        token: token,
        onerror: function(error) {
            l(error);
        },
    });

    var sendMessage = function(nick, from, channel, message) {
        if (!enabled) return;
        var hash = _getHash(nick);
        if (!hash) return;
        var msg = {
            user: hash,
            message: message,
            title: "Mentioned in " + channel + " by " + from
        }
        p.send(msg);
    }

    this.events = {
        message: function (from, channel, message) {
            // Loop through available users
            _.each(_db, function(hash, user) {
                // If any of them are mentioned
                if (~message.toLowerCase().indexOf(user.toLowerCase())) {
                    if (~message.toLowerCase().indexOf('!notify')) return;
                    // Send a message to them
                    sendMessage(user, from, channel, message);
                }
            })
        }
    }
    
    var _getHash = function(user) {
        return _db[user];
    }

    var _setHash = _.bind(function(user, hash) {
        _db[user] = hash;
        this.syncBase('pushover', _db);
    }, this);

    this.commands = {
        'push-register': function(from, to, hash) {
            // [hash] Register a pushover user hash to yourself
            _setHash(from, hash);
        },
        notify: function(from, to, nick) {
            // [nick] [message] Send a message to a nick
            var hash = _getHash(nick);
            if (! hash) {
                this.noddy.say(to, "Sorry, that user isn't registered with me, !help push-register");
                return;
            }
            var text = this.getText(arguments);
            var msg = {
                user: hash,
                message: text,
                title: "Notification from "+from
            };
            if (enabled) {
                p.send(msg);
            }
        }
    }
}
