var _ = require('underscore');
var https = require('https');
var geocoder = require('geocoder');

module.exports = function() {
    this.name = 'Rain';
    var config = this.loadBase('rain', {});
    var l = this.noddy.log;

    var getData = function(loc, callback) {
        https.get('https://api.forecast.io/forecast/'+config.token+'/'+loc, function(res) {
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

    var processRainDataForLocation = function(loc, to) {
        getData(loc, function(json) {
            if (! json.minutely) {
                // No minutely data available
                // Lets try hourly
                say(to, json.currently.summary +", "+ json.hourly.summary);
                return;
            }
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

    this.commands = {
        rain: function(from, to) {
            // [location] Is it about to rain?
            var text = this.getText(arguments, 2);
            if (text) {
                geocoder.geocode(text, function (err, data) {
                    if (err) return;
                    var l = data.results[0].geometry.location;
                    var locationString = [l.lat, l.lng].join(',');
                    //console.log(data.results[0].geometry);
                    console.log(locationString);
                    // do stuff with data
                    processRainDataForLocation(locationString, to);
                });
            } else {
                processRainDataForLocation(config.location, to);
            }
        },
        "rain-set-token": function(from, to, token) {
            // [token] Set the forecast.io token
            config.token = token;
            this.syncBase('rain', config);
        },
        "rain-set-location": function(from, to, location) {
            // [location] Set the default location
            config.location = location;
            this.syncBase('rain', config);
        }
    }
}
