IRC Noddification Bot
---------------------

Config
======

Edit the config file `./config/config.json` and fill in your IRC server details

The runtime settings are persisted in `./config/settings.json`

Install required modules via npm

    underscore request nodemailer irc drex

The official version of drex doesn't currently work very well
so checkout https://github.com/yarekt/drex and use branch `fixup-for-npm`
then do:

   npm install ./drex

run node js server

    node server.js

