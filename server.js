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
        client.say(to, "Its is.... Bens turn to make tea!");
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
});
client.addListener('error', function(message) {
    console.log('error: ', message);
});
client.addListener('message', function (from, to, message) {
    handlers.forEach(function(handler, key) {
        var regex = new RegExp(handler.regex);
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
        availableBackends[user.backend].sendMessage(
            user,
            message
        );
    });
}
_.forEach(users, function(user) {
    addHandlerForUser(user);
})

onMessage(/^\!.*/, function(from, to, message) {
    var commandTokens = message.match(/^\!([a-zA-Z]+)\s*(.*)$/);
    var commandName = commandTokens[1];
    var params = commandTokens[2].split(' ');
    params.unshift(from, to);
    if (! commands[commandName]) {
        client.say('Unknown command: '+commandName);
        return;
    }
    commands[commandName].apply(client, params);
})