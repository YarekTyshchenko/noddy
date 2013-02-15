var _ = require('underscore');
var fs = require('fs');
module.exports = function() {
    this.name = 'Tea';
    var _settingsFilename = './teabase.json';
    var _people = {
        'Ben': 0,
        'yarekt': 0,
        'wayne': 0,
        'richardj': 0,
        'alexf': 0
    };
    if (fs.existsSync(_settingsFilename)) {
        _people = JSON.parse(fs.readFileSync(_settingsFilename, 'utf8'));
    };

    var _lastTeaMaker = null;

    var _getRandomName = function() {
        var _min;
        _.forEach(_people, function(teas, name) {
            if (_.isUndefined(_min) || teas <= _min) {
                _min = teas;
            }
        });
        var _list = [];
        _.forEach(_people, function(teas, name) {
            if (teas == _min) {
                _list.push(name);
            }
        });

        return _lastTeaMaker = _list[Math.floor(Math.random()*_list.length)];
    }

    var _updateTeaBase = function(value) {
        if (_lastTeaMaker) {
            _people[_lastTeaMaker] += value;
            // Save tea base
            fs.writeFileSync(_settingsFilename, JSON.stringify(_people, null, 4));
        }
    }
    this.commands = {
        tea: function(from, to) {
            // Pick someone to make tea
            var name = _getRandomName();
            this.noddy.say(to, "It's ... " + name + "'s turn to make tea!");
        },
        goodtea: function() {
            // That cuppa was gooooooood!
            _updateTeaBase(1);
        },
        badtea: function() {
            // Ewww, bad tea. bad
            _updateTeaBase(-1);
        },
        teastats: function(from, to) {
            // Display tea awesomness
            this.noddy.say(to, 'Tea statistics');
            this.noddy.say(to, '==============');
            _.forEach(_people, function(teas, name) {
                this.noddy.say(to, teas+' '+name);
            }, this);
        }
    }
}