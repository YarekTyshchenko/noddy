var _ = require('underscore');
module.exports = function() {
    this.name = 'Core plugin';
    this.commands = {
        add: function(from, to, name, regex, backend, json) {
            // [name] [regex] [backend] [json] Add notification
            try {
                var json = JSON.parse(json);
            } catch(e) {
                this.noddy.say(from, "Invalid JSON");
                return; // Maybe comment this?
            }
            if (! this.noddy.verifyBackendConfig(backend, json, _.bind(function(error) {
                this.noddy.say(from, error);
            }, this))) return;

            this.noddy.addUser(name, regex, backend, json);
        },
        list: function(from, to) {
            // List all configuration
            this.noddy.say(from, 'Currently configured notifications');
            _.forEach(this.noddy.getUsers(), function(user, key) {
                this.noddy.say(from, key + ' : ' + JSON.stringify(user, null, 4));
            }, this);
        },
        toggle: function(from, to, name) {
            // [name] Toggle notification
            var users = this.noddy.getUsers();
            if (! users[name]) {
                this.noddy.say(to, "No notification found for " + name);
                return;
            }
            if (users[name].disabled) {
                users[name].disabled = false;
                this.noddy.say(to, 'Notification ' + name + ' has been enabled');
            } else {
                users[name].disabled = true;
                this.noddy.say(to, 'Notification ' + name + ' has been disabled');
            }
            this.noddy.syncUsers();
        },
        delete: function(from, to, name) {
            // [name] Delete a notification by name
            var users = this.noddy.getUsers();
            if (! users[name]) {
                this.noddy.say(to, "No notification found for " + name);
                return;
            }
            delete users[name];
            this.noddy.syncUsers();
            this.noddy.say(to, 'Notification ' + name + ' has been deleted');
        },
        say: function(from, to, dest) {
            // [to] [message] Send message to person or channel
            var text = this.getText(arguments, 3);
            this.noddy.say(dest, text);
        },
        join: function(from, to, channel) {
            // [channel] Join a channel
            this.noddy.join(channel);
        },
        part: function(from, to, channel) {
            // [channel] Part channel
            var channel = channel || to;
            this.noddy.part(channel);
        },
        help: function(from, to, arg) {
            // [name] Lists all commands
            var getHelp = _.bind(function(name) {
                //console.log(this);
                var f = this.noddy.getCommands()[name];
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
                this.noddy.say(to, argHelp);
                return;
            }
            this.noddy.say(to, 'Available commands: ' + Object.keys(this.noddy.getCommands()).join(','));
        }
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