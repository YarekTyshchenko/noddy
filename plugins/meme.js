var natural = require('natural');
var request = require('request');
var _ = require('underscore');

module.exports = function() {
    this.name = 'Meme';
    var m = this.noddy.getConfig().memegenerator;
    var memegeneratorUrl = "http://version1.api.memegenerator.net/Instance_Create?username="+m.username+"&password="+m.password+"&languageCode=en";
    var _generateImage = function(generator, image, textTop, textBottom, callback) {
        var url = memegeneratorUrl+'&generatorID='+
            encodeURIComponent(generator)+'&imageID='+
            encodeURIComponent(image)+'&text0='+
            encodeURIComponent(textTop)+'&text1='+
            encodeURIComponent(textBottom);
        request(url, function (error, response, body) {
            if (error || response.statusCode !== 200) {
                console.log(error);
                console.log(response);
                return;
            }
            result = JSON.parse(body);
            //console.log(result);
            callback(result.result.instanceImageUrl);
        });
    }

    var classifier = new natural.BayesClassifier();
    classifier.addDocument('one does not simply', 'one-does-not-simply-a');
    classifier.addDocument('not sure if or just', 'Futurama-Fry');
    classifier.addDocument('and then', 'Insanity-Wolf');
    classifier.addDocument('only after', 'Insanity-Wolf');
    classifier.train();

    var generatorMap = {
        'Insanity-Wolf': {
            generatorId: 45,
            imageId: 20,
        },
        'Futurama-Fry': {
            generatorId: 305,
            imageId: 84688,
        },
        'one-does-not-simply-a': {
            generatorId: 689854,
            imageId: 3291562,
        }
    }

    var lastGoodMeme = null;
    var _classify = function(message) {
        var memeClass = classifier.getClassifications(message);
        // if good enough
        if (memeClass.length < 1) return;

        var max = 0;
        var avg = 0;
        _.forEach(memeClass, function(c) {
            if (max < c.value) {
                max = c.value;
            }
            avg += c.value;
        });
        avg = avg / memeClass.length;

        var generator = classifier.classify(message);
        var text = _parseText(message, generator);

        console.log([memeClass, avg, max, generator, text]);

        if (avg == max) return;
        if (!text) return;
        lastGoodMeme = {
            generatorId: generatorMap[generator].generatorId,
            imageId: generatorMap[generator].imageId,
            textTop: text.top,
            textBottom: text.bottom,
            generated: false
        }
    }
    var _parseText = function(message, generator) {
        switch (generator) {
            case 'Futurama-Fry':
                var matches;
                if (/or/i.test(message)) {
                    matches = message.match(/(not sure if .*) (or .*)/i);
                } else {
                    matches = message.match(/(not sure if) (.*)/i);
                }
                if (!matches) return false;
                return {top: matches[1], bottom: matches[2]};
            default:
                return false;
        }
    }

    var _getRecentMeme = function(channel) {
        if (lastGoodMeme) {
            return lastGoodMeme;
        }
        return false;
    }

    this.events = {
        message: function(from, to, message) {
            // Decode message to see if it fits a meme
            // Store as last meme
            _classify(message);
        }
    }
    this.commands = {
        meme: function(from, to, command) {
            // try to generate meme from last captured text
            var meme = _getRecentMeme(from);
            if (meme && !meme.generated) {
                _generateImage(meme.generatorId, meme.imageId, meme.textTop, meme.textBottom, _.bind(function(url) {
                    this.noddy.say(to, url);
                    // set meme generated flag
                    lastGoodMeme.generated = url;
                }, this));
            }
        },
        mapmeme: function(from, to, generator) {
            var text = this.getText(arguments, 3);
            // Add text template to generator
            classifier.addDocument(text, generator);
            classifier.train();
        }
    }
}