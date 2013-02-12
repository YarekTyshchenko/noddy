var irc = require('irc');
var _ = require('underscore');
var fs = require('fs');

var config = require('./config/config.json');

var availableBackends = {};
_.forEach(config.backends, function(backend) {
    availableBackends[backend] = require('./backends/'+backend);
})

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
        addHandlerForUser(user);
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
var settingsFilename = './settings.json';
var users = {};
if (fs.existsSync(settingsFilename)) {
    users = JSON.parse(fs.readFileSync(settingsFilename, 'utf8'));
}

var syncUsers = function() {
    fs.writeFileSync(settingsFilename, JSON.stringify(users, null, 4));
}


var client = new irc.Client(config.irc.server, config.irc.nick, {
    channels: config.irc.channels,
    userName: 'noddy',
    realName: 'Nod Noddington Rodriguez'
});
client.addListener('error', function(message) {
    console.log('error: ', message);
});
client.addListener('message', function (from, to, message) {
    handlers.forEach(function(handler, key) {
        var regex = new RegExp(handler.regex, 'i');
        if (regex.exec(message)) {
            handler.callback(from, to, message);
        }
    });
});

var onMessage = function(regex, callback) {
    handlers.push({regex:regex, callback:callback});
}

var addHandlerForUser = function(user) {
    onMessage(user.regex, function(from, to, message) {
        if (!user.disabled) {            
            availableBackends[user.backend].sendMessage(
                user, from, to, message
            );
        }
    });
}
_.forEach(users, function(user) {
    addHandlerForUser(user);
})

var isAdmin = function(user) {
    return (_.indexOf(config.admins, user) > -1);
}

var isAdminCommand = function(command) {
    return (_.indexOf(config.adminCommands, command) > -1);
}

onMessage('^\!.*', function(from, to, message) {
    if (from == config.irc.nick) {
        return;
    }
    var commandTokens = message.match(/^\!([a-zA-Z]+)\s*(.*)$/);
    var commandName = commandTokens[1];
    var params = commandTokens[2].split(' ');
    params.unshift(from, to);
    if (! commands[commandName]) {
        client.say('Unknown command: '+commandName);
        return;
    }
    if (isAdminCommand(commandName) && !isAdmin(from)) {
        return;
    }
    commands[commandName].apply(client, params);
})