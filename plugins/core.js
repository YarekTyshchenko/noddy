var _ = require('underscore');
exports.commands = {
    add: function(from, to, name, regex, backend, json) {
        // [name] [regex] [backend] [json] Add notification
        try {
            var json = JSON.parse(json);
        } catch(e) {
            this.say(from, "Invalid JSON");
            return; // Maybe comment this?
        }
        if (! this.verifyBackendConfig(backend, json, _.bind(function(error) {
            this.say(from, error);
        }, this))) return;

        this.addUser(name, regex, backend, json);
    },
    list: function(from, to) {
        // List all configuration
        this.say(from, 'Currently configured notifications');
        _.forEach(this.getUsers(), function(user, key) {
            this.say(from, key + ' : ' + JSON.stringify(user, null, 4));
        }, this);
    },
    toggle: function(from, to, name) {
        // [name] Toggle notification
        var users = this.getUsers();
        if (! users[name]) {
            this.say(to, "No notification found for " + name);
            return;
        }
        if (users[name].disabled) {
            users[name].disabled = false;
            this.say(to, 'Notification ' + name + ' has been enabled');
        } else {
            users[name].disabled = true;
            this.say(to, 'Notification ' + name + ' has been disabled');
        }
        this.syncUsers();
    },
    delete: function(from, to, name) {
        // [name] Delete a notification by name
        var users = this.getUsers();
        if (! users[name]) {
            this.say(to, "No notification found for " + name);
            return;
        }
        delete users[name];
        this.syncUsers();
        this.say(to, 'Notification ' + name + ' has been deleted');
    },
    say: function(from, to, dest) {
        // [to] [message] Send message to person or channel
        var text = Array.prototype.slice.call(arguments, 3);
        this.say(dest, text.join(' '));
    },
    join: function(from, to, channel) {
        // [channel] Join a channel
        this.join(channel);
    },
    part: function(from, to, channel) {
        // [channel] Part channel
        var channel = channel || to;
        this.part(channel);
    },
    help: function(from, to, arg) {
        // [name] Lists all commands
        var getHelp = _.bind(function(name) {
            var f = this.getCommands()[name]
            if (name && (!_.isUndefined(f))) {
                var fun = f.toString().split('\n')[1];
                var matches = fun.match(/\s+\/\/\s+(?:(\[.*\])\s+)?(.*)/);
                if (matches) {
                    var result = (name + " - " + matches[2]);
                    if (matches[1]) {
                        result = (name + ' ' + matches[1] + ' - ' + matches[2])
                    }
                    return result;
                }

                return (name + " - No Help available");
            }
            return false;
        }, this);
        var argHelp = getHelp(arg);
        if (argHelp) {
            this.say(to, argHelp);
            return;
        }
        this.say(to, 'Available commands: ' + Object.keys(this.getCommands()).join(','));
    }
}

/*
Tests
===================
!help
!add test t logger {}
t
!toggle test
t
!list
!toggle test
t
!list
!delete test
!say #noddy2 test
!join #test
!part #test
 */