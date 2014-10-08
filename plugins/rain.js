var _ = require('underscore');
var https = require('https');

module.exports = function() {
    this.name = 'Rain';
    var _db = this.loadBase('rain', {});
    var l = this.noddy.log;

    var token = this.noddy.getConfig().plugins.rain.token;
    var location = this.noddy.getConfig().plugins.rain.location;

    var getData = function(callback) {
        https.get('https://api.forecast.io/forecast/'+token+'/'+location, function(res) {
            var response = '';
            res.on('data', function(chunk) {
                response += chunk;
            });
            res.on('end', function() {
                callback(JSON.parse(response));
            });
        });
    };

    var say = this.noddy.say;

    this.commands = {
        rain: function(from, to) {
            // Is it about to rain?
            getData(function(json) {
                //console.log(json.minutely.data);
                var graph = '';
                var cache = 0.0;
                var sampled = json.minutely.data.map(function(slice) {
                    return slice.precipProbability;
                })
                .reduce(function(list, curr, index) {
                    var gamma = 3;
                    if (index % gamma == gamma-1) {
                        list[Math.floor(index / gamma)] = (cache+curr) / gamma;
                        cache = 0.0;
                    } else {
                        cache += curr;
                    }
                    return list;
                }, []);
                //console.log(sampled);
                _.forEach(sampled, function(slice) {
                    graph += function() {
                        var g = Math.floor(slice * 9);
                        //console.log(g);
                        switch (g) {
                            case 0: return '\u2001';
                            case 1: return '\u2581';
                            case 2: return '\u2582';
                            case 3: return '\u2583';
                            case 4: return '\u2584';
                            case 5: return '\u2585';
                            case 6: return '\u2586';
                            case 7: return '\u2587';
                            case 8: return '\u2588';
                            case 9: return '\u2589';
                            default: return '.';
                        }
                    }();
                });
                say(to, json.minutely.summary + " |"+graph+"|");
            });
        }
    }
}
