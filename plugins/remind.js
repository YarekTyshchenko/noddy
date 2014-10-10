var _ = require('underscore');
var dateFormat = require('dateformat');
module.exports = function() {
    this.name = 'Remind';
    var _base = this.loadBase('remind', {reminders:{}, said:{}});

    var _getReminder = _.bind(function(channel, nick) {
        if (!_base.reminders[channel] || !_base.reminders[channel][nick]) return;
        var reminder = _base.reminders[channel][nick];
        delete _base.reminders[channel][nick];
        if (!_base.said[channel]) _base.said[channel] = {};
        _base.said[channel][nick] = reminder;
        // Save the base
        this.syncBase('remind', _base);

        return reminder;
    }, this);

    var _setReminder = _.bind(function(channel, nick, from, text) {
        if (!_base.reminders[channel]) _base.reminders[channel] = {};
        _base.reminders[channel][nick] = {
            from: from,
            text: text,
            time: dateFormat("yy-mm-dd h:MM TT")
        };
        this.syncBase('remind', _base);
    }, this);

    var _repeatReminder = _.bind(function(channel, nick) {
        if (!_base.said[channel] || !_base.said[channel][nick]) {
            var reminder = _getReminder(channel, nick);
            if (!reminder) return;
            return reminder;
        }
        return _base.said[channel][nick];
    }, this);

    var _format = function(reminder, from) {
        return ['[', reminder.time, '] ', from, ' <- ', reminder.from, ': ',reminder.text].join('');
    }

    this.events = {
        join: function (from, to, user) {
            //Ignore ourselves
            if (user.nick == this.noddy.getConfig().irc.nick) return;
            var reminder = _getReminder(from, user.nick);
            if (!reminder) return;

            // Say the reminder
            this.noddy.say(from, _format(reminder, user.nick));
        }
    }
    this.commands = {
        remind: function(from, to, nick) {
            // [nick] [text] Send someone a reminder once they join
            var text = this.getText(arguments, 3);
            if (!text) {
                // First check if we have a fresh reminder
                var reminder = _getReminder(to, from);
                if (!reminder) return;
                this.noddy.say(to, _format(reminder, from));
                return;
            };
            _setReminder(to, nick, from, text);
        },
        repeat: function(from, to) {
            // Repeat your last reminder
            // Check if you have a last reminder
            var reminder = _repeatReminder(to, from);
            if (!reminder) return;
            // Repeat it
            this.noddy.say(to, _format(reminder, from));
        }
    }
}
