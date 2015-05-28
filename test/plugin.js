var assert = require('assert');
require("blanket");

var Plugin = require('../plugin');

describe("Core", function() {
	describe("Base Plugin", function() {
		it("can create a base plugin", function() {
			var basePlugin = new Plugin({});
			assert.equal(basePlugin.name, "Base Plugin");
			assert.equal(basePlugin.getName(), "Base Plugin");
		});
	});
});