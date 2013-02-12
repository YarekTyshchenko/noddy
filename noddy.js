var irc = require('irc');
var fs = require('fs');
var _ = require('underscore');

var Noddy = function() {
    var config = require('./config/config.json');
    // load plugins
    var commands = {};
    fs.readdirSync("./plugins").forEach(function(file) {
        var plugin = require("./plugins/" + file);
        _.forEach(plugin.commands, function(command, name) {
            commands[name] = command;
        });
    });

    var settingsFilename = './settings.json';
    var users = {};
    if (fs.existsSync(settingsFilename)) {
        users = JSON.parse(fs.readFileSync(settingsFilename, 'utf8'));
    }

    var syncUsers = function() {
        fs.writeFileSync(settingsFilename, JSON.stringify(users, null, 4));
    }

    // Include backends
    var availableBackends = {};
    _.forEach(config.backends, function(backend) {
        availableBackends[backend] = require('./backends/' + backend);
    });

    // Set up IRC client
    var client = new irc.Client(config.irc.server, config.irc.nick, {
        channels: config.irc.channels,
        userName: 'noddy',
        realName: 'Nod Noddington Rodriguez'
    });

    client.addListener('error', function(message) {
        console.log('error: ', message);
    });

    var isAdmin = function(user) {
        return (_.indexOf(config.admins, user) > -1);
    }

    var isAdminCommand = function(command) {
        return (_.indexOf(config.adminCommands, command) > -1);
    }

    var noddy = {
        say: function(to, text) {
            client.say(to, text);
        },
        join: function(channel) {
            client.join(channel);
        },
        part: function(channel) {
            client.part(channel);
        },
        verifyBackendConfig: function(backendName, json, errorCallback) {
            // Check if it exitss
            var backend = availableBackends[backendName];
            if (! backend) {
                errorCallback('Submit a merge request for this backend');
                return false;
            }

            // Verify config is sane
            return backend.verifyConfig(json, errorCallback);
        },
        addUser: function(name, regex, backend, config) {
            var user = {
                regex: regex,
                backend: backend,
            };
            user[backend] = config;
            users[name] = user;
            syncUsers();
        },
        syncUsers: function() {
            syncUsers();
        },
        getUsers: function() {
            return users;
        },
        getCommands: function() {
            return commands;
        }
    };

    // Listen for messages
    client.addListener('message', function(from, to, message) {
        // Ignore itself
        if (from == config.irc.nick) {
            return;
        }

        // User notifications
        _.forEach(users, function(user) {
            var regex = new RegExp(user.regex, 'i');
            if (regex.exec(message) && !user.disabled) {
                availableBackends[user.backend].sendMessage(
                    user, from, to, message
                );
            }
        });

        // Command functions
        var commandTokens = message.match(/^\!([a-zA-Z]+)\s*(.*)$/);
        if (! commandTokens) return;
        var commandName = commandTokens[1];
        var params = commandTokens[2].split(' ');
        params.unshift(from, to);
        if (! commands[commandName]) {
            console.log('Unknown command: ' + commandName);
            return;
        }
        if (isAdminCommand(commandName) && !isAdmin(from)) {
            return;
        }
        commands[commandName].apply(noddy, params);
    });

    return noddy;
}

module.exports = Noddy();
