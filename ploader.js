var fs = require('fs');
var _ = require('underscore');
var path = require('path');

function Ploader() {
    var getNewPlugins = function(folder) {
        var newPlugins = [];
        fs.readdirSync(folder).forEach(function(file) {
            // Only read files ending in JS extension
            if (! /\.js$/i.test(file)) return;
            newPlugins.push(file);
        });
        return newPlugins;
    }

    var safeRequire = function(file, callback, errorCallback) {
        errorCallback = errorCallback || function(e){
            console.log(e);
        };

        try {
            var plugin = require(file);
            callback(plugin);
        } catch (e) {
            console.log('Error in plugin:', file);
            console.log(e);
        }
    }

    var pluginFiles = {}; // This shouldn't be here, can't call watch twice
    // Read the dir for current plugin files
    var readPlugins = function(folder, addCallback, readCallback, removeCallback) {
        var newPlugins = getNewPlugins(folder);
        // Load added plugins
        _.difference(newPlugins, Object.keys(pluginFiles)).forEach(function(file) {
            var filename = path.resolve([folder,file].join('/'));
            var resolvedPath = path.resolve(folder);
            // Load the plugin
            safeRequire(filename, function(plugin) {
                addCallback(plugin, file);
            });
            // Attach fs watcher
            var watch = fs.watch(filename, (function(){
                var previous = fs.statSync(filename).mtime.getTime() / 1000;
                return function() {
                    // Check file mtime
                    if (! fs.existsSync(filename)) return;
                    var current = fs.statSync(filename).mtime.getTime() / 1000;
                    // Reload plugin memory location above
                    if (current > previous) {
                        // Remove previous cache file .cache.js_8273642
                        var previousCacheName = [resolvedPath,'/','.',file,'_',previous].join('');
                        if (fs.existsSync(previousCacheName)) {
                            fs.unlinkSync(previousCacheName);
                        }
                        // Read file contents into cache file
                        var currentCacheName = [resolvedPath,'/','.',file,'_',current].join('');
                        fs.writeFileSync(currentCacheName, fs.readFileSync(filename));

                        // Require cache file
                        safeRequire(currentCacheName, function(plugin) {
                            readCallback(plugin, file);
                        });
                    }
                    previous = current;
                }
            })());

            pluginFiles[file] = watch;
        });
        // Unload removed plugins
        _.difference(Object.keys(pluginFiles), newPlugins).forEach(function(file) {
            // Delete the plugin from plugins hash
            removeCallback(file);
            // Unwatch the file
            pluginFiles[file].close();
            delete pluginFiles[file];
        });
    }
    return {
        watch: function(pluginPath, addCallback, readCallback, removeCallback) {
            // Clear the dir of previous cache files
            fs.readdirSync(pluginPath).forEach(function(file) {
                if (/\..*_\d+$/.test(file)) {
                    // Potentially dangerous
                    console.log('Removing old cache file:',file);
                    fs.unlinkSync(path.resolve([pluginPath,file].join('/')));
                }
            });
            readPlugins(pluginPath, addCallback, readCallback, removeCallback);
            // Watch folder for plugin additions or deletions
            fs.watch(pluginPath, function() {
                readPlugins(pluginPath, addCallback, readCallback, removeCallback);
            });
        }
    }
}

module.exports = new Ploader();