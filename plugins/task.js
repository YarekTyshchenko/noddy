var _ = require('underscore');

module.exports = function(){
    this.name = 'Task';
    var tasks = this.loadBase('tasks', {});
    this.commands = {
        task: function(from, to) {
            // [task text] Add task to yourself
            var text = this.getText(arguments);
            if (!text) {
                // Display all tasks
                if (tasks[from]) {
                    tasks[from].forEach(_.bind(function(task, key) {
                        this.noddy.say(to, [key,from+':',task].join(' '));
                    }, this));
                } else {
                    this.noddy.say(to, 'You have no tasks');
                }
                return;
            }

            if (! tasks[from]) {
                tasks[from] = [];
            }
            var id = tasks[from].push(text);
            this.syncBase('tasks', tasks);
            this.noddy.say(to, 'Task set: '+(id-1));
        },
        done: function(from, to, id) {
            // [task_id] Mark task as completed
            if (tasks[from][id]) {
                this.noddy.say(to, 'Congratulations, You have completed task: '+tasks[from][id]);
                delete tasks[from][id];
                this.syncBase('tasks', tasks);
            }
        }
    }
}
