var _ = require('underscore');

module.exports = function(){
    this.name = 'Words';
    var words = this.loadBase('words');

    this.events = {
        message: function(from, to, message) {
            if (!words[from]) {
                words[from] = {};
            }
            var wordsArray = message.split(' ');
            _.forEach(wordsArray, function(word) {
                if (!words[from][word]) {
                    words[from][word] = 1;
                } else {
                    words[from][word] += 1;
                }
            });
            this.syncBase('words', words);
            console.log(words);
        }
    }
    this.commands = {
        words: function(from, to) {
            if (!words[from]) return;
            var order = [];
            _.forEach(words[from], function(count, word) {
                order.push({word:word, count:count});
            });
            order.sort(function(a, b) {
                return a.count - b.count;
            });
            var word = order.pop();
            this.noddy.say(to, ['Most commonly used word is:', word.word, 'Used:', word.count, 'times'].join(' '));
        }
    }
}