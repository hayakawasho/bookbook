.PHONY: install dev build preview clean

install:
	npm install

dev:
	npm run dev:bff & npm run dev

build:
	npm run build

preview:
	npm run preview

clean:
	rm -rf node_modules apps/web/node_modules apps/bff/node_modules \
		packages/utils/node_modules apps/web/dist
