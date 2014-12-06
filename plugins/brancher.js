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
    var timeoutRef;
    // Start a timer
    var timeout = function() {
        _.each(repoList, function(repo) {
            var deletion = [];
            var rebase = [];
            _.each(repo.branches, function(branch) {
                if (!branch.stats || branch.name == repo.default_branch) return;
                if (branch.stats.behind > 1) {
                    if (branch.stats.ahead > 0) {
                        rebase.push(branch);
                    } else {
                        deletion.push(branch);
                    }
                }
            });
            _.each(repo.channels, function(channel) {
                // Pick a random branch to pester people about
                if (_.random(0,1)) {
                    var b = _.sample(deletion, 1)[0];
                    if (!b) return;
                    say(channel,
                        [
                            "Branch", b.name, formatStats(b.stats), "is horribly out of date,", b.stats.behind,
                            "commits behind master, and 0 commits ahead. Please spare its life and delete it"
                        ].join(' ')
                    );
                } else {
                    var b = _.sample(rebase, 1)[0];
                    if (!b) return;
                    say(channel,
                        [
                            "Rebase branch", b.name, "Its behind master", formatStats(b.stats)
                        ].join(' ')
                    );
                }

                if (rebase.length == 0 && deletion.length == 0) {
                    if (! _.random(0,100)) {
                        // 1 in 100
                        say(channel, ["Team superstars! All your branches on", repo.name, "are up to date, Keep being awesome !"].join(' '));
                    }
                }
            });
        });
        clearTimeout(timeoutRef);
        timeoutRef = setTimeout(timeout, _.random(1,24)*60*60*1000);
    };
    this.init = function() {
        timeoutRef = setTimeout(timeout, _.random(1,24)*60*60*1000);
    };
    this.destroy = function() {
        //timeout = function(){};
        clearTimeout(timeoutRef);
        return {};
    }

    this.commands = {
        'add-repo': function(from, to, name, user, repo) {
            // [nickname] [user] [repo] Add a repo to watch list
            repoList[name] = {name: name, user:user, repo:repo, channels: [to]};
            sync();
            getDefaultBranch(repo, function(default_branch) {
                listBranches(repoList[name], function(branches) {
                    say(to, ["Got", branches.length, "branches"].join(' '));
                });
            });
        },
        'pester-repo': function(from, to, name) {
            if (! repoList[name]) {
                say(to, "Repo not found, add it with add-repo command");
                return;
            }
            repoList[name].channels.push(to);
            sync();
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
                if (stats.behind > 0) {
                    say(to, [branch, formatStats(stats)].join(' '));
                }
            });
        }
    }
}