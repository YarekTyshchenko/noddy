var fs = require('fs');

module.exports = function (noddy) {
    this.name = 'Base Plugin';
    this.commands = {};
    this.events = {};
    this.noddy = noddy;
    this.getName = function() {
        return this.name;
    }
    this.getCommand = function(name) {
        if (this.commands[name]) {
            return this.commands[name];
        }
        return false;
    }
    this.getText = function(args, position) {
        position = position || 2;
        return Array.prototype.slice.call(args, position).join(' ');
    }

    // Databases
    var getFilename = function(plugin, name) {
        return './bases/'+plugin+'Base_'+name+'.json';
    };
    this.loadBase = function(name, hash) {
        hash = hash || {};
        var filename = getFilename(this.name, name);
        if (fs.existsSync(filename)) {
            return JSON.parse(fs.readFileSync(filename, 'utf8'));
        }
        return hash;
    }

    this.syncBase = function(name, hash) {
        var filename = getFilename(this.name, name);
        fs.writeFileSync(
            filename,
            JSON.stringify(hash, null, 4)
        );
    }
}

