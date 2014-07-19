var _ = require('underscore');
module.exports = function() {
    this.name = 'Core plugin';
    this.commands = {
        say: function(from, to, dest) {
            // [to] [message] Send message to person or channel
            var text = this.getText(arguments, 3);
            this.noddy.say(dest, text);
        },
        join: function(from, to, channel) {
            // [channel] Join a channel
            this.noddy.join(channel);
        },
        part: function(from, to, channel) {
            // [channel] Part channel
            var channel = channel || to;
            this.noddy.part(channel);
        },
        help: function(from, to, arg) {
            // [name] Lists all commands
            var getHelp = _.bind(function(name) {
                //console.log(this);
                var f = this.noddy.getCommands()[name];
                if (name && (!_.isUndefined(f))) {
                    var fun = f.toString().split('\n')[1];
                    var matches = fun.match(/\s+\/\/\s+(?:(\[.*\])\s+)?(.*)/);
                    if (matches) {
                        var result = (name + " - " + matches[2]);
                        if (matches[1]) {
                            result = (name + ' ' + matches[1] + ' - ' + matches[2])
                        }
                        return result;
                    }

                    return (name + " - No Help available");
                }
                return false;
            }, this);
            var argHelp = getHelp(arg);
            if (argHelp) {
                this.noddy.say(to, argHelp);
                return;
            }
            this.noddy.say(to, 'Available commands: ' + Object.keys(this.noddy.getCommands()).join(','));
        },
        reload: function() {
            // Reload all plugins
            this.noddy.reload();
        }
    }
}
