IRC Noddification Bot
---------------------

Config
======

Edit the config file `./config/config.json` and fill in your IRC server details

The runtime settings for plugins are persisted in `./bases/*.json`

Install required modules via npm

    underscore irc ploader dateformat

run node js bot with

    node noddy.js

test with mocha

    npm install mocha blanket
    make test
    make coverage
    open coverage.html

Plugins
=======

The bot comes with three plugins, motd, remind, and task tracker. Core plugin
contains logic for using the bot with IRC as well as providing help on other
commands. !help should explain how to use each command

Plugin Loader
-------------

Plugins directory is automatically loaded when any file is changed
It works by using Ploader module which watches filesystem for changes in files.
Sometimes it doesn't work right on all platforms.

Writing plugins
---------------

Writing plugins is super simple. The plugin architecture provides hooks for
most important events, and commands hash gives you ability to register
your own !commands. Put the plugin source into plugins directory and it will
be automatically loaded into the bot at runtime. Just make sure that the plugin
source doesn't have syntax errors
