var PusherClient = require('pusher-client');
module.exports = function() {
	this.name = "Travis";
	var noddy = this.noddy;
	var pusherClient = new PusherClient('8e4fa50680ab8c9fb4de');
	var channel = pusherClient.subscribe('travis');
	channel.bind('build', function(data) {
		console.log(data)
		noddy.say("#noddy", JSON.stringify(data));
	});
}