var _ = require('underscore');

var commands = {
    tea: function(from, to) {
        this.say(to, "It's ... Ben's turn to make tea!");
    },
    add: function(from, to, name, regex, backend, json) {
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
        this.say(from, 'Currently configured notifications');
        _.forEach(this.getUsers(), function(user, key) {
            this.say(from, key + ' : ' + JSON.stringify(user, null, 4));
        }, this);
    },
    toggle: function(from, to, name) {
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
        var text = Array.prototype.slice.call(arguments, 3);
        this.say(dest, text.join(' '));
    },
    join: function(from, to, channel) {
        this.join(channel);
    },
    part: function(from, to, channel) {
        var channel = channel || to;
        this.part(channel);
    },
    help: function(from, to) {
        // Lists all commands
        _.forEach(commands, function(fn, key) {
            var fun = fn.toString().split('\n')[1];
            if (! /\s+\/\//.exec(fun)) {
                this.say(to, key + " - No Help available");
            } else {
                var matches = fun.match(/\s+\/\/\s+(.*)/);
                if (matches) {
                    this.say(to, key + " - " + matches[1]);
                }
            }
        }, this);
    }
}

var noddy = require('./noddy.js')(commands);


