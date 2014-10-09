var _ = require('underscore');

module.exports = function(){
    this.name = 'Goals';
    var goals = this.loadBase('goals');
    this.commands = {
        goal: function(from, to) {
            // [goal text] Add goal to yourself
            var text = this.getText(arguments);

            if (! goals[from]) {
                goals[from] = [];
            }
            goals[from].push(text);
            this.syncBase('goals', goals);
            this.noddy.say(to, 'Goal set');
        },
        goals: function(from, to) {
            // Display all your goals
            if (goals[from]) {
                goals[from].forEach(_.bind(function(goal, key) {
                    this.noddy.say(to, [key,from+':',goal].join(' '));
                }, this));
            } else {
                this.noddy.say(to, 'You have no goals');
            }
        },
        done: function(from, to, id) {
            // [goal_id] Mark goal as completed
            if (goals[from][id]) {
                this.noddy.say(to, 'Congratulations, You have done goal: '+goals[from][id]);
                delete goals[from][id];
                this.syncBase('goals', goals);
            }
        }
    }
}