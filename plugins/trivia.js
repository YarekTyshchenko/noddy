var parseString = require('xml2js').parseString;
var request = require('request');
var _ = require('underscore');
var database = {};
var scores = {};

module.exports = function() {
    this.name = 'Trivia';
    database = this.loadBase('questions', {});
    blacklist = this.loadBase('blacklist', []);
    scores = this.loadBase('scores', {});

    /**
     * Parse the question as returned by quizbang into a more usable format
     */
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

    /**
     * Load new questions from the web service and add them to the questions list
     */
    var getNewQuestions = function() {
        console.log('Requesting');
        request('http://www.quizbang.co.uk/cgi-bin/fetch.pl?command=questions&num=100',
            function (error, response, body) {
                console.log('Got response');
                if (!error && response.statusCode == 200) {
                    parseString(body, function (err, result) {
                        _.forEach(result.quizbang.questions[0].question, function(q) {
                            var question = parseQuestion(q);
                            console.log(!!database[question.id] +' '+ question.text);
                            addQuestion(question);
                        });
                    });
                } else {
                    console.log(error);
                    console.log(response);
                }
            }
        );
    }

    var _currentQuestion;

    /**
     * Add a new question to the db and save it
     */
    var addQuestion = _.bind(function(question) {
        database[question.id] = question;
        // sync
        this.syncBase('questions', database);
    }, this);

    /**
     * Get a random question
     */
    var getQuestion = _.bind(function() {
        var q;
        do {
            q = database[Object.keys(database)[Math.floor(Math.random()*Object.keys(database).length)]];
        } while(blacklist.indexOf(q.id) > -1);
        console.log(blacklist.indexOf(q.id));
        console.log(q.answer.text);
        _currentQuestion = q;
        return q;
    }, this);

    /**
     * Get a user from a username, if it does not exist, return an empty one initialized with zeroed values
     */
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

    var creditUser = _.bind(function(user, q) {
        var user = getUser(user);
        user.questions++;
        user.correct++;
        user.score += (q.difficulty.score/100);
        this.syncBase('scores', scores);
    }, this);

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
        var q = getQuestion();
        var tags = [];
        _.forEach(q.tag, function(tag){ tags.push(tag.text)});

        q.mask = q.answer.text.replace(/[A-Za-z0-9]/ig, '-');
        this.noddy.say(channel, "Question " + q.id + ": " + q.text);
        this.noddy.say(channel, "[Categories: " + tags.join(', ') + '] Answer: ' + q.mask);
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

    var answerQuestion = _.bind(function(text) {
        if (checkAnswer(text)) {
            clearTimeouts();
            if (blacklist.indexOf(_currentQuestion.id) === -1) {
                blacklist.push(_currentQuestion.id);
                this.syncBase('blacklist', blacklist);
            }

            setTimeout(sendQuestion, 1000);
            return true;
        }
        return false;
    }, this);

    this.events = {
        message: function(from, to, message) {
            if (channel == to && ! timeout && _currentQuestion) {
                if (answerQuestion(message)) {
                    creditUser(from, _currentQuestion);
                    this.noddy.say(
                        to,
                        'Well done ' + from + ', ' + scores[from].correct  + ' correct, score: ' + (Math.round(scores[from].score*100)/100)
                    );
                }
            }
        }
    }

    /**
     * The commands that this plugin exposes
     */
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
            var text = this.getText(arguments);
            if (timeout) {
                sendQuestion();
                return;
            }
            if (answerQuestion(text)) {
                creditUser(from, _currentQuestion);
                this.noddy.say(to, 'Well done ' + from + ', ' + scores[from].correct  + ' correct, score: ' + (Math.round(scores[from].score*100)/100));
            }
        },
        hint: function(from, to) {
            // Give answer choices
            if (! scores[from]) return;
            if (! _currentQuestion) return;
            var ans = _currentQuestion.answer.text;
            if (ans.length <= 3) {
                this.noddy.say(to, 'Can haz hint? No don\'t be stupid');
                return;
            }
            scores[from].hints++;
            var hints = [];

            var mask = _currentQuestion.mask.split('');
            var matches = ans.match(/[(A-Za-z0-9)]/g);

            var shuffled = _.shuffle(matches).slice(0, Math.ceil(matches.length/10));

            for (var ind in shuffled) {
                for (var j in ans.split('')) {
                    if(ans[j] == shuffled[ind]) {
                        mask[j] = shuffled[ind];
                    }
                }
            }
            _currentQuestion.mask = mask.join('');
            this.noddy.say(to, 'Answer: ' + _currentQuestion.mask);

        },
        scores: function(from, to) {
            // Display all scores
            _.forEach(scores, function(score, user) {
                this.noddy.say(to, user+' '+(Math.round(score.score*100)/100));
            }, this);
        },
        score: function(from, to) {
            // Display your score
            if (scores[from]) {
                this.noddy.say(to, from+' '+(Math.round(scores[from].score*100)/100));
            }
        },
        getquestions: function(from, to) {
            // Get moar questions
            this.noddy.say(to, [Object.keys(database).length,'Questions in database'].join(' '));
            //getNewQuestions();
        }
    }
}