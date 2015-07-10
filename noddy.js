var irc = require('irc');
var _ = require('underscore');
var util = require('util');
var l = require('util').log;
var ploader = require('ploader');
var fs = require('fs');

var Plugin = require('./plugin');

process.on('uncaughtException', function(err) {
    l('=== Uncaught Exception Crash ===')
    l(err);
    l(err.stack);
});

var events = [
    'join', 'part', 'names', 'topic', 'nick', 'invite', 'whois' // message implied
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
        },
        getConfigVar: function(plugin, key) {
            if (_.has(config.plugins, plugin) && _.has(config.plugins[plugin], key)) {
                return config.plugins[plugin][key];
            }
            return null;
        },
        log: function(message) {
            l(message);
        }
    };

    var loader = ploader.attach('./plugins', {
        add: function(plugin, file) {
            // Instantiate the base plugin class
            var basePlugin = new Plugin(noddy);
            // Extend it with custom plugin
            plugin.call(basePlugin);
            basePlugin.init();
            plugins[file] = basePlugin;
            l(['Loaded plugin:',file,'with name:',basePlugin.getName()].join(' '));
        },
        read: function(plugin, file) {
            // Reread callback
            var basePlugin = new Plugin(noddy);
            // Extend it with custom plugin
            plugin.call(basePlugin);
            // Extract payload on destruction, if possible
            var payload;
            if (!_.isUndefined(plugins[file])) {
                payload = plugins[file].destroy();
            }
            basePlugin.init(payload);
            plugins[file] = basePlugin;
            l(['Reread plugin:', file].join(' '));
        },
        remove: function(file) {
            // Remove plugin on deletion
            if (!_.isUndefined(plugins[file])) {
                plugins[file].destroy();
                delete plugins[file];
            }
            l(['Unloaded plugin:',file].join(' '));
        },
        error: function(file, e) {
            l(['Problem in plugin', file, ':', e].join(' '));
        }
    });

    // Attach reload handlers
    noddy.reload = function() {
        loader.reload();
    };
    fs.watch('./plugins', function() {
        loader.reload();
    });

    // Set up IRC client
    var client = new irc.Client(config.irc.server, config.irc.nick, {
        channels: config.irc.channels,
        userName: 'noddy',
        realName: 'Nod Noddington Rodriguez',
        retryCount: config.irc.retryCount
    });

    client.addListener('error', function(message) {
        l('error: ', message);
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
    client.addListener('message', function(from, to, message, event) {
        // Ignore itself
        if (from === client.nick) {
            return;
        }

        // Attach plugin event
        _.forEach(plugins, function(plugin) {
            if (plugin.events['message']) {
                plugin.events['message'].call(plugin, from, to, message, event);
            }
        });

        // Command functions
        var commandTokens = message.match(/^\!([a-zA-Z0-9\-]+)\s*(.*)$/);
        if (! commandTokens) return;
        var commandName = commandTokens[1];
        var params = commandTokens[2].split(' ');
        params.unshift(from, to);
        if (! noddy.getCommands()[commandName]) {
            l('Unknown command: ' + commandName);
            return;
        }
        if (isAdminCommand(commandName) && !isAdmin(from)) {
            return;
        }
        try {
            callCommand(commandName, params);
        } catch (e) {
            l("Error in command: '"+commandName+"'");
            l(e);
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
