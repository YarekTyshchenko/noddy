var CBuffer = require('CBuffer');
var request = require('request');
var emailBackend = require('./notify-backends/email');

module.exports = function() {
    this.name = 'Notify';
    var buffers = {};
    var getBuffer = function(channel) {
        if (! buffers[channel]) {
            buffers[channel] = new CBuffer(1000);
        }
        return buffers[channel];
    }

    this.init = function(payload) {
        if (!payload) return;
        buffers = payload;
    }

    this.destroy = function() {
        return buffers;
    }

    this.events = {
        message: function(from, to, message, eventt) {
            // User notifications
            getBuffer(to).push(message);
        }
    };
    this.commands = {
        notify: function(from, to, nick, lines) {
            if (!nick) return;
            if (!lines) {
                lines = 100;
            }
            // Get email via ldap plugin
            emailBackend.sendMessage({
                email: {
                    email: this.noddy.ldapLinks[nick].email
                    // Refactor that awfulness somehow
                }
            }, from, to, getBuffer(to).toArray().reverse().slice(0,lines).reverse().join('\n'));
        }
    }
}