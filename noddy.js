var irc = require('irc');
var fs = require('fs');
var _ = require('underscore');
var drex = require('drex');
var Plugin = require('./plugin');

process.on('uncaughtException', function(err) {
  console.log(err);
});

function Noddy() {
    var config = require('./config/config.json');
    var plugins = {};
    var pluginFiles = [];
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
            var list = {}
            _.forEach(plugins, function(plugin) {
                _.forEach(plugin.getCommands(), function(command, name) {
                    list[name] = command;
                });
            });

            return list;
        },
        getConfig: function() {
            return config;
        }
    };
    var readPlugins = function() {
        var newPlugins = [];
        fs.readdirSync("./plugins").forEach(function(file) {
            newPlugins.push(file);
        });
        // Load plugins
        _.difference(newPlugins, pluginFiles).forEach(function(file) {
            drex.require("./plugins/" + file, function(plugin) {

                // Instantiate the base plugin class
                var actualPlugin = new Plugin(noddy);
                // Extend it with custom plugin
                plugin.call(actualPlugin);
                console.log('Loaded plugin: '+file+' with name: '+actualPlugin.getName());
                plugins[file] = actualPlugin;
            }, function(error) {
                console.log("Error in plugin: "+file);
                console.log(error);
            });

            pluginFiles.push(file);
        });
        // Unload plugins
        _.difference(pluginFiles, newPlugins).forEach(function(file) {
            console.log('Unloaded plugin: '+file);
            // Delete the plugin from plugins hash
            drex.unwatch('./plugins/' + file);
            delete plugins[file];
        });
        pluginFiles = _.intersection(pluginFiles, newPlugins);
    }

    // Watch folder for plugin additions or deletions
    fs.watch('./plugins', function(event, filename) {
        readPlugins();
    });
    readPlugins();

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

    client.addListener('join', function(from, to, user) {
        _.forEach(plugins, function(plugin) {
            if (plugin.events['join']) {
                plugin.events['join'].call(plugin, from, to, user);
            }
        });
    });
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
            var index = Object.keys(plugin.getCommands()).indexOf(commandName);
            if (index > -1) {
                return plugin.getCommands()[commandName].apply(plugin, params);
            }
        });
    }

    return noddy;
}

module.exports = Noddy();
