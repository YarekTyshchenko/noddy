test:
	@./node_modules/.bin/mocha

coverage:
	@./node_modules/.bin/mocha --require blanket -R html-cov > coverage.html

.PHONY: test
