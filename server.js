var _ = require('underscore');
var fs = require('fs');


var commands = {
    tea: function(from, to) {
        this.say(to, "It's ... Ben's turn to make tea!");
    },
    add: function(from, to, name, regex, backend, json) {
        try {
            var json = JSON.parse(json || '{}');
        } catch(e) {
            this.say(to, "Invalid JSON");
            return;
        }
        console.log(json);
        if (! availableBackends[backend]) {
            this.say(to, 'Submit a merge request for this backend');
            return;
        }
        var user = {
            regex: regex,
            backend: backend,
        };
        user[backend] = json;
        users[name] = user;
        syncUsers();
        this.say(to, "User added");
    },
    list: function(from, to) {
        this.say(to, 'Currently configured notifications');
        _.forEach(users, function(user, key) {
            this.say(to, key + ' : ' + JSON.stringify(user, null, 4));
        }, this);
    },
    toggle: function(from, to, name) {
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
        syncUsers();
    },
    delete: function(from, to, name) {
        if (! users[name]) {
            this.say(to, "No notification found for " + name);
            return;
        }
        delete users[name];
        syncUsers();
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

var handlers = [];
var availableBackends = {};
var users = {};
var noddy = require('./noddy.js')(handlers, availableBackends, commands, users);

var settingsFilename = './settings.json';
if (fs.existsSync(settingsFilename)) {
    users = JSON.parse(fs.readFileSync(settingsFilename, 'utf8'));
}

var syncUsers = function() {
    fs.writeFileSync(settingsFilename, JSON.stringify(users, null, 4));
}
