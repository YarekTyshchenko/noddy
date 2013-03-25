var CBuffer = require('CBuffer');
var request = require('request');
var emailBackend = require('./notify-backends/email');

module.exports = function() {
    this.name = 'Notify';
    var notifications = this.loadBase('notifications',
        {
            links:{}
        }
    );
    var buffer = new CBuffer(1000);

    this.init = function(payload) {
        if (!payload) return;
        buffer = payload;
    }

    this.destroy = function() {
        return buffer;
    }

    var getDataForHex = function(hex, callback) {
        request.get(
            'http://intranet.yarekt.dev.affiliatewindow.com:82/profile/index/hex/'+hex,
            {
                headers: {
                    'X-Requested-with': 'XMLHttpRequest'
                }
            },
            function(error, response, body) {
                if (error || response.statusCode != 200) return;
                callback(JSON.parse(body));
            }
        );
    }

    this.events = {
        message: function(from, to, message) {
            // User notifications
            buffer.push(message);
        }
    };
    this.commands = {
        link: function(from, to, hex) {
            notifications['links'][from] = hex;
        },
        notify: function(from, to, nick, lines) {
            if (!nick) return;
            if (!lines) {
                lines = 100;
            }
            // Get email via ldap
            getDataForHex(notifications['links'][nick], function(person) {
                // Send email to person.email;
                emailBackend.sendMessage(
                    {
                        email: {
                            email: person.email
                        }
                    },
                    from, to, buffer.toArray().join('\n')
                );
            });
        }
    }
}