var parseString = require('xml2js').parseString;
var request = require('request');
var _ = require('underscore');
var fs = require('fs');
var database = {};
var scores = {};

function Trivia() {
    var _settingsFilename = './quizbase.json';
    if (fs.existsSync(_settingsFilename)) {
        database = JSON.parse(fs.readFileSync(_settingsFilename, 'utf8'));
    };
    var _scoresFilename = './scores.json';
    if (fs.existsSync(_scoresFilename)) {
        scores = JSON.parse(fs.readFileSync(_scoresFilename, 'utf8'));
    };

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

    var addQuestion = function(question) {
        database[question.id] = question;
        // sync
        fs.writeFileSync(_settingsFilename, JSON.stringify(database, null, 4));

    };

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

    var syncUsers = function() {
        fs.writeFileSync(_scoresFilename, JSON.stringify(scores, null, 4));
    }

    var creditUser = function(user, q) {
        var user = getUser(user);
        user.questions++;
        user.correct++;
        user.score += (q.difficulty.score/100);
        syncUsers();
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

    return {
        quiz: function(from, to) {
            // Start the quiz
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
                this.say(to, 'Well done '+from+', '+scores[from].correct+' correct, score: '+scores[from].score);
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
            this.say(to, 'Hints are: ['+hints.join('] [')+']');
        },
        scores: function(from, to) {
            // Display all cores
            _.forEach(scores, function(score, user) {
                this.say(to, user+' '+score.score);
            }, this);
        },
        score: function(from, to) {
            // Display your score
            if (scores[from]) {
                this.say(to, from+' '+scores[from].score);
            }
        },
        getquestions: function() {
            // Get moar questions
            getNewQuestions();
        }
    }
}

exports.commands = Trivia();