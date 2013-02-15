var parseString = require('xml2js').parseString;
var request = require('request');
var _ = require('underscore');
var database = {};
var scores = {};

module.exports = function() {
    this.name = 'Trivia';
    database = this.loadBase('questions', {});
    scores = this.loadBase('scores', {});

    var parseQuestion = function(q) {
        var tags = [];
        _.forEach(q.tag, function(t) {
            tags.push({
                id: t['$'].id,
                text: t['$'].text
            });
        });
        var choices = [];
        _.forEach(q.answer, function(a) {
            choices.push({
                id: a['$'].id,
                text: a['$'].text
            });
        })
        var question = {
            id: q['$'].id,
            text: q['$'].text,
            answer: {
                id: q.answer[0]['$'].id,
                text: q.answer[0]['$'].text
            },
            choices: choices,
            tag: tags,
            difficulty: {
                score: q.difficulty[0]['$'].score,
                category: q.difficulty[0]['$'].category
            }
        };
        return question;
    }

    var getNewQuestions = function() {
        request('http://www.quizbang.co.uk/cgi-bin/fetch.pl?command=questions&num=10', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                parseString(body, function (err, result) {
                    _.forEach(result.quizbang.questions[0].question, function(q) {
                        var question = parseQuestion(q);
                        addQuestion(question);
                    });
                });
            }
        });
    }

    var _currentQuestion;

    var addQuestion = _.bind(function(question) {
        database[question.id] = question;
        // sync
        this.syncBase('questions', database);
    }, this);

    var getQuestion = function() {
        var q = database[Object.keys(database)[Math.floor(Math.random()*Object.keys(database).length)]];
        _currentQuestion = q;
        return q.text;
    };

    var getUser = function(user) {
        if (! scores[user]) {
            scores[user] = {
                questions: 0,
                correct: 0,
                score: 0,
                hints: 0
            };
        }
        return scores[user];
    }

    var creditUser = function(user, q) {
        var user = getUser(user);
        user.questions++;
        user.correct++;
        user.score += (q.difficulty.score/100);
        this.syncBase('scores', scores);
    }

    var timeout = false;
    var checkAnswer = function(text) {
        if (_currentQuestion.answer.text.toLowerCase() == text.toLowerCase()) {
            return true;
        }
        return false;
    }

    var channel;
    var timeouts;
    var sendQuestion = _.bind(function() {
        if (! channel) return;
        timeout = false;
        this.noddy.say(channel, getQuestion());
        clearTimeouts();
        timeouts.push(setTimeout(_.bind(function() {
            this.noddy.say(channel, '5 seconds left');
        }, this), 25000));
        timeouts.push(setTimeout(_.bind(function() {
            timeout = true;
            this.noddy.say(channel, 'Time out');
        }, this), 30000));
    }, this);

    var clearTimeouts = function() {
        _.forEach(timeouts, function(timeout) {
            clearTimeout(timeout);
        });
        timeouts = [];
    }

    this.commands = {
        quiz: function(from, to) {
            // Start the quiz
            if (Object.keys(database).length < 1) {
                this.noddy.say(to, "No questions found");
                return;
            }
            channel = to;
            sendQuestion();
        },
        q: function(from, to) {
            // [Answer] Attempt to answer the question
            if (! _currentQuestion) return;
            var text = Array.prototype.slice.call(arguments, 2).join(' ');
            if (timeout) {
                sendQuestion();
                return;
            }
            if (checkAnswer(text)) {
                clearTimeouts();
                // Credit the user
                creditUser(from, _currentQuestion);
                this.noddy.say(to, 'Well done '+from+', '+scores[from].correct+' correct, score: '+scores[from].score);
                setTimeout(sendQuestion, 1000);
            }
        },
        hint: function(from, to) {
            // Give answer choices
            if (! scores[from]) return;
            if (! _currentQuestion) return;
            scores[from].hints++;
            var hints = [];
            _.forEach(_currentQuestion.choices, function(choice) {
                hints.push(choice.text);
            });
            this.noddy.say(to, 'Hints are: ['+hints.join('] [')+']');
        },
        scores: function(from, to) {
            // Display all cores
            _.forEach(scores, function(score, user) {
                this.noddy.say(to, user+' '+score.score);
            }, this);
        },
        score: function(from, to) {
            // Display your score
            if (scores[from]) {
                this.noddy.say(to, from+' '+scores[from].score);
            }
        },
        getquestions: function() {
            // Get moar questions
            getNewQuestions();
        }
    }
}