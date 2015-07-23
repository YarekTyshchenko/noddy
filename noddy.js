var irc = require('irc');
var _ = require('underscore');
var util = require('util');
var l = require('util').log;
var ploader = require('ploader');
var fs = require('fs');
var config = require('config');

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
    // Actual plugin hash
    var plugins = {};
    // Raw Plugins found in plugins dir and read
    var availablePlugins = {};
    // Map of bools for plugins initiated and responding to events
    var enabledPlugins = config.enabledPlugins;

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
        },
        loadPlugin: function(file, payload) {
            if (! _.has(availablePlugins, file)) {
                l(['Plugin with file:', file, 'doesn\'t exist'].join(' '));
                return;
            }

            if (_.has(plugins, file)) {
                l(['Plugin with file:', file, 'is already loaded'].join(' '));
                return;
            }

            // Load the plugin
            plugin = availablePlugins[file];
            // Instantiate the base plugin class
            var basePlugin = new Plugin(noddy);
            // Extend it with custom plugin
            plugin.call(basePlugin);
            basePlugin.init(payload);
            plugins[file] = basePlugin;
            l(['Loaded plugin:', file,'with name:', basePlugin.getName()].join(' '));
        },
        unloadPlugin: function(file) {
            if (_.isUndefined(plugins[file])) {
                return {};
            }

            // Remove plugin on deletion
            var payload = plugins[file].destroy();
            delete plugins[file];
            l(['Unloaded plugin:',file].join(' '));
            return payload
        },
        enablePlugin: function(file) {
            enabledPlugins[file] = true;
        },
        disablePlugin: function(file) {
            delete enabledPlugins[file];
        }
    };

    var loader = ploader.attach('./plugins', {
        add: function(plugin, file) {
            availablePlugins[file] = plugin;
            l(['Read file:', file].join(' '));

            if (_.has(enabledPlugins, file)) {
                noddy.loadPlugin(file);
            }
        },
        read: function(plugin, file) {
            availablePlugins[file] = plugin;
            l(['Re-read file:', file].join(' '));
            console.log(enabledPlugins);
            if (_.has(enabledPlugins, file)) {
                var payload = noddy.unloadPlugin(file);
                noddy.loadPlugin(file, payload);
            }
        },
        remove: function(file) {
            delete availablePlugins[file];
            l(['Removed file:', file].join(' '));

            if (_.has(enabledPlugins, file)) {
                noddy.unloadPlugin(file);
            }
        },
        error: function(file, e) {
            l(['Problem in plugin', file, ':', e].join(' '));
            l(e.stack);
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
            l(e.stack);
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
