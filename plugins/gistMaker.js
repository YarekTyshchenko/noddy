var GitHubApi = require("github");
var fs = require("fs");

var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    //debug: true,
    //protocol: "https",
    headers: {
        "user-agent": "yarekt/noddy brancher v0.0.0", // GitHub is happy with a unique user agent
    }
});

module.exports = function() {
	this.name = "GistMaker";
	var getFirstElement = function(array) {
		for (e in array) {
			return {key: e, value: array[e]};
		}
	}
	this.commands = {
		pluginFromGist: function(from, to, gistId) {
			github.gists.get({
				id: gistId
			}, function(err, resp) {
				if (err) {
					console.log(err);
					return;
				}
				var file = getFirstElement(resp.files);
				//console.log(file.key);
				//console.log(file.value.content);

				fs.writeFileSync("plugins/" + file.key, file.value.content);
			});
		}
	}
}