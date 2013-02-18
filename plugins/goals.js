var _ = require('underscore');

module.exports = function(){
    this.name = 'Goals';
    var goals = this.loadBase('goals');
    this.commands = {
        goal: function(from, to) {
            var text = this.getText(arguments);

            if (! goals[from]) {
                goals[from] = [];
            }
            goals[from].push(text);
            this.syncBase('goals', goals);
            this.noddy.say(to, 'Goal set');
        },
        goals: function(from, to) {
            if (goals[from]) {
                goals[from].forEach(_.bind(function(goal, key) {
                    this.noddy.say(to, [key,from+':',goal].join(' '));
                }, this));
            }
        },
        done: function(from, to, id) {
            if (goals[from][id]) {
                this.noddy.say(to, 'Congratulations, You have done goal: '+goals[from][id]);
                delete goals[from][id];
                this.syncBase('goals', goals);
            }
        }
    }
}