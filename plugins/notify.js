var fs = require('fs');
var _ = require('underscore');
var path = require('path');

module.exports = function() {
    this.name = 'Notify';
    var notifications = this.loadBase('notifications');
    
    var addUser = _.bind(function(regex, backend, config) {
        var user = {
            regex: regex,
            backend: backend,
        };
        user[backend] = config;
        notifications[[regex,backend].join('-')] = user;
        this.syncBase('notifications', notifications);
    }, this);

    // Include backends
    var availableBackends = {};
    _.forEach(this.noddy.getConfig().backends, function(backend) {
        // Add dynamic plugin loading
        availableBackends[backend] = require('./notify-backends/' + backend);
    });

    var verifyBackendConfig = function(backendName, json, errorCallback) {
        // Check if it exitss
        var backend = availableBackends[backendName];
        if (! backend) {
            errorCallback('Submit a merge request for this backend');
            return false;
        }

        // Verify config is sane
        return backend.verifyConfig(json, errorCallback);
    }

    this.events = {
        message: function(from, to, message) {
            // User notifications
            _.forEach(notifications, function(user) {
                var regex = new RegExp(user.regex, 'i');
                if (regex.exec(message) && !user.disabled) {
                    availableBackends[user.backend].sendMessage(
                        user, from, to, message
                    );
                }
            });
        }
    }
    this.commands = {
        add: function(from, to, regex, backend, json) {
            // [regex] [backend] [json] Add notification
            try {
                var json = JSON.parse(json);
            } catch(e) {
                this.noddy.say(from, "Invalid JSON");
                return; // Maybe comment this?
            }
            if (! verifyBackendConfig(backend, json, _.bind(function(error) {
                this.noddy.say(from, error);
            }, this))) return;

            addUser(regex, backend, json);
        },
        list: function(from, to) {
            // List all configuration
            this.noddy.say(from, 'Currently configured notifications');
            _.forEach(notifications, function(user, key) {
                this.noddy.say(from, key + ' : ' + JSON.stringify(user, null, 4));
            }, this);
        },
        toggle: function(from, to, name) {
            // [name] Toggle notification
            if (! notifications[name]) {
                this.noddy.say(to, "No notification found for " + name);
                return;
            }
            if (notifications[name].disabled) {
                notifications[name].disabled = false;
                this.noddy.say(to, 'Notification ' + name + ' has been enabled');
            } else {
                notifications[name].disabled = true;
                this.noddy.say(to, 'Notification ' + name + ' has been disabled');
            }
            this.syncBase('notifications', notifications);
        },
        delete: function(from, to, name) {
            // [name] Delete a notification by name
            if (! notifications[name]) {
                this.noddy.say(to, "No notification found for " + name);
                return;
            }
            delete notifications[name];
            this.syncBase('notifications', notifications);
            this.noddy.say(to, 'Notification ' + name + ' has been deleted');
        }
    }
}