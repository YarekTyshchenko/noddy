var request = require('request');
var _ = require('underscore');
module.exports = function() {
    this.name = 'Ldap';
    var links = this.loadBase('links');
    this.noddy.ldapLinks = links;
    var getDataForHex = function(hex, callback) {
        request.get(
            'http://intranet.totalent/profile/index/hex/'+hex,
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

    this.commands = {
        link: function(from, to, hex) {
            // [hex] Link your nick to Intranet profile hex
            getDataForHex(hex, _.bind(function(person) {
                links[from] = person;
                this.syncBase('links', links);
            }, this));;
        },
        ldap: function(from, to, name) {
            // [nick] Display LDAP info on a nick
            var person = links[name];
            if (!person) return;

            ['name','email','mobile'].forEach(_.bind(function(field) {
                this.noddy.say(to, [field, person[field]].join(': '));
            }, this));
        }
    }
}