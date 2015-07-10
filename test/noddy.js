var assert = require('assert');
require("blanket");

var Noddy = require('../noddy');

describe("Noddy", function() {
	describe("Config", function() {
		it("Can extract plugin config from config", function() {
			var token = Noddy.getConfigVar('Test', 'token');
			assert.equal(token, "token");
		});
	});
});