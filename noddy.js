var irc = require('irc');
var _ = require('underscore');
var util = require('util');
var l = require('util').log;
var ploader = require('ploader');

var Plugin = require('./plugin');

process.on('uncaughtException', function(err) {
    console.log('=== Uncaught Exception Crash ===')
    console.log(err);
});

var events = [
    'join', 'part' // message implied
];

function Noddy() {
    var config = require('./config/config.json');
    var plugins = {};
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
        getCommands: function() {
            var list = {}
            _.forEach(plugins, function(plugin) {
                _.forEach(plugin.commands, function(command, name) {
                    list[name] = command;
                });
            });

            return list;
        },
        getConfig: function() {
            return config;
        }
    };

    ploader.watch('./plugins', function(plugin, file) {
        // Instantiate the base plugin class
        var basePlugin = new Plugin(noddy);
        // Extend it with custom plugin
        plugin.call(basePlugin);
        plugins[file] = basePlugin;
        l(['Loaded plugin:',file,'with name:',basePlugin.getName()].join(' '));
    }, function(plugin, file) {
        // Reread callback
        var basePlugin = new Plugin(noddy);
        // Extend it with custom plugin
        plugin.call(basePlugin);
        plugins[file] = basePlugin;
        l(['Reread plugin:', file].join(' '));
    }, function(file) {
        // Remove plugin on deletion
        delete plugins[file];
        l(['Unloaded plugin:',file].join(' '));
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

    // Attach all events
    events.forEach(function(event) {
        client.addListener(event, function() {
            var args = arguments;
            _.forEach(plugins, function(plugin) {
                if (plugin.events[event]) {
                    plugin.events[event].apply(plugin, args);
                }
            });
        });
    });

    // Listen for messages
    client.addListener('message', function(from, to, message) {
        // Ignore itself
        if (from == config.irc.nick) {
            return;
        }

        // Attach plugin event
        _.forEach(plugins, function(plugin) {
            if (plugin.events['message']) {
                plugin.events['message'].call(plugin, from, to, message);
            }
        });

        // Command functions
        var commandTokens = message.match(/^\!([a-zA-Z0-9\-]+)\s*(.*)$/);
        if (! commandTokens) return;
        var commandName = commandTokens[1];
        var params = commandTokens[2].split(' ');
        params.unshift(from, to);
        if (! noddy.getCommands()[commandName]) {
            console.log('Unknown command: ' + commandName);
            return;
        }
        if (isAdminCommand(commandName) && !isAdmin(from)) {
            return;
        }
        try {
            callCommand(commandName, params);
        } catch (e) {
            console.log("Error in command: '"+commandName+"'");
            console.log(e);
        }
    });

    var callCommand = function(commandName, params) {
        _.forEach(plugins, function(plugin) {
            var command = plugin.getCommand(commandName);
            if (command) {
                command.apply(plugin, params);
            }
        });
    }

    return noddy;
}

module.exports = Noddy();
