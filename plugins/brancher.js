var _ = require('underscore');
var GitHubApi = require("github");

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

module.exports = function(){
    this.name = 'Brancher';
    var say = this.noddy.say;
    var repoList = this.loadBase('repos', {});
    var sync = _.bind(function() {
        this.syncBase('repos', repoList);
    }, this);

    var listBranches = function(repo, callback) {
        // Add a timeout
        // if (repo.branches) {
        //     console.log("Got branches from Cache");
        //     var list = [];
        //     _.each(repo.branches, function(branch) {
        //         list.push(branch.name);
        //     });
        //     callback(list);
        //     return;
        // }
        github.repos.getBranches({
            user: repo.user,
            repo: repo.repo
        }, function(err, res) {
            var list = [];
            repo.branches = {};
            _.each(res, function(branch) {
                list.push(branch.name);
                repo.branches[branch.name] = {name: branch.name};
            });
            repo.lastChecked = null; // @TODO: write the time
            sync();
            callback(list);
        });
    };

    var auth = function() {
        github.authenticate({
            type: "oauth",
            token: this.noddy.getConfig().plugins.brancher.token
        });
    };


    var getDefaultBranch = function(repo, callback) {
        // // Add a timeout
        // if (repo.default_branch) {
        //     console.log("Got default branch from Cache");
        //     callback(repo.default_branch);
        //     return;
        // }
        github.repos.get({
            user: repo.user,
            repo: repo.repo,
        }, function(err, res) {
            if (err) { console.log(err); return }
            // cache this
            repo.default_branch = res.default_branch;
            sync();
            callback(res.default_branch);
        });
    };

    var compare = function(repo, base, head, callback) {
        // add a timeout
        // if (repo.branches[head].stats) {
        //     callback(repo.branches[head].stats);
        // }
        github.repos.compareCommits({
            user: repo.user,
            repo: repo.repo,
            base: base,
            head: head
        }, function(err, res) {
            if (err) { console.log(err); return }
            var stats = {ahead: res.ahead_by, behind: res.behind_by, total: res.total_commits};
            repo.branches[head].stats = stats;
            sync();
            callback(stats);
        });
    };

    var formatStats = function(stats) {
        // {"ahead":4,"behind":16,"total":4}
        // 6 ------|++ 2
        var times = function(t, c) {
            var string = '';
            if (t > 10) t = 10;
            _.times(t, function() {
                string += c;
            }, string);
            return string;
        };
        return ['[', stats.behind, ' ', times(stats.behind, '-'), '|', times(stats.ahead, '+'), ' ', stats.ahead, ']'].join('');
    };

    var getBranchStats = function(repo, callback) {
        auth();
        getDefaultBranch(repo, function(default_branch) {
            listBranches(repo, function(branches) {
                _.each(branches, function(branch) {
                    if (default_branch == branch) return;
                    compare(repo, default_branch, branch, function(stats) {
                        callback(branch, stats);
                    });
                });
            });
        });
    };

    // Start a timer
    // If its time to check branches
    // Check one branch, Pick a random person
    // Bug them to rebase a branch

    this.events = {
        message: function() {
            // Measure frequency of chatter
            // Record into variable
        }
    }

    this.commands = {
        'add-repo': function(from, to, name, user, repo) {
            // [nickname] [user] [repo] Add a repo to watch list
            repoList[name] = {name: name, user:user, repo:repo};
            sync();
            listBranches(repoList[name], function(branches) {
                say(to, ["Got", branches.length, "branches"].join(' '));
            });
        },
        'remove-repo': function(from, to, name) {
            if (! repoList[name]) {
                say(to, "Repo not found, add it with add-repo command");
                return;
            }
            delete(repoList[name]);
            sync();
        },
        check: function(from, to, name) {
            // Check all branches
            if (! repoList[name]) {
                say(to, "Repo not found, add it with add-repo command");
                return;
            }

            var repo = repoList[name];
            getBranchStats(repo, function(branch, stats) {
                //repo.branches[branch] = {name:branch, stats:stats, lastChecked:''};
                if (stats.behind > 0) {
                    say(to, [repo.repo, branch, formatStats(stats)].join(' '));
                }
            });
        }
    }
}