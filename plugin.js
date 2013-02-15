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
}

