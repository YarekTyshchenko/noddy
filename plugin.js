var fs = require('fs');

module.exports = function (noddy) {
    this.name = 'Base Plugin';
    this.commands = {};
    this.noddy = noddy;
    this.getName = function() {
        return this.name;
    }
    this.getCommands = function() {
        return this.commands;
    }

    // Databases
    var getFilename = function(plugin, name) {
        return './bases/'+plugin+'Base_'+name+'.json';
    };
    this.loadBase = function(name, hash) {
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

