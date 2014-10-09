module.exports = function(){
    this.name = 'Sandwich';
    this.commands = {
        sandwich: function(from, to) {
            // Make me a sandwich
            if (from === 'yarekt') {
                this.noddy.say(to, "Sure, here go you. *makes sandwich*");
                return;
            }
            this.noddy.say(to, "Make it yourself!");
        }
    }
}