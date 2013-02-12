var irc = require('irc');
var fs = require('fs');
var _ = require('underscore');
//var plugins = {};
//readdirSync("./plugins").forEach(function(file) {
//    plugins[file] = require("./plugins/" + file);
//});


var Noddy = function(handlers, availableBackends, commands, users) {
    var config = require('./config/config.json');

    // Include backends
    _.forEach(config.backends, function(backend) {
        availableBackends[backend] = require('./backends/'+backend);
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

    // Listen for messages
    client.addListener('message', function (from, to, message) {
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
    });

    return {
        say: client.say,
        join: client.join,
        part: client.part
    }
}

module.exports = Noddy;
