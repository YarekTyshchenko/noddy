name ?= yarekt/noddy
tag ?= latest
repo ?= registry.hub.docker.com

all: build test xunit coverage

#push:
#	docker tag -f $(name):$(tag) $(repo)/$(name):$(tag)
#	docker push $(repo)/$(name):$(tag)

build:
	docker build -t $(name):$(tag) .

test:
	docker run --rm $(name):$(tag) make internal_test

xunit:
	docker run --rm $(name):$(tag) make internal_xunit > xunit.xml

coverage:
	docker run --rm $(name):$(tag) make internal_coverage > coverage.html

internal_test:
	@./node_modules/.bin/mocha

internal_xunit:
	@./node_modules/.bin/mocha -R xunit | grep "<"

internal_coverage:
	@./node_modules/.bin/mocha --require blanket -R html-cov

.PHONY: push build test xunit coverage internal_test internal_xunit internal_coverage
