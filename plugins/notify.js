var CBuffer = require('CBuffer');
var request = require('request');
var emailBackend = require('./notify-backends/email');

module.exports = function() {
    this.name = 'Notify';
    var buffer = new CBuffer(1000);

    this.init = function(payload) {
        if (!payload) return;
        buffer = payload;
    }

    this.destroy = function() {
        return buffer;
    }

    this.events = {
        message: function(from, to, message) {
            // User notifications
            buffer.push(message);
        }
    };
    this.commands = {
        notify: function(from, to, nick, lines) {
            if (!nick) return;
            if (!lines) {
                lines = 100;
            }
            // Get email via ldap plugin
        }
    }
}