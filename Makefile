NPM := npm

.PHONY: install dev dev-web dev-api build deploy-api deploy-api-prod preview storybook build-storybook test lint lint-fix clean db-migrate db-migrate-remote db-migrate-prod

install:
	$(NPM) install

dev:
	$(NPM) run dev -w @bookbook/api & $(NPM) run dev -w @bookbook/web

dev-web:
	$(NPM) run dev -w @bookbook/web

dev-api:
	$(NPM) run dev -w @bookbook/api

build:
	$(NPM) run build -w @bookbook/web

deploy-api:
	$(NPM) run deploy -w @bookbook/api

preview:
	$(NPM) run preview -w @bookbook/web

storybook:
	$(NPM) run storybook -w @bookbook/web

build-storybook:
	$(NPM) run build-storybook -w @bookbook/web

test:
	$(NPM) run test -w @bookbook/utils
	$(NPM) run test -w @bookbook/web
	$(NPM) run test -w @bookbook/api

lint:
	$(NPM) exec biome check .

lint-fix:
	$(NPM) exec biome check --write .

db-migrate:
	cd apps/api && $(NPM) exec wrangler d1 migrations apply bookbook-db --local

db-migrate-remote:
	cd apps/api && $(NPM) exec wrangler d1 migrations apply bookbook-db --remote

deploy-api-prod:
	cd apps/api && $(NPM) exec wrangler deploy -- --env production

db-migrate-prod:
	cd apps/api && $(NPM) exec wrangler d1 migrations apply bookbook-db -- --remote --env production

clean:
	rm -rf node_modules apps/web/node_modules apps/api/node_modules \
		packages/utils/node_modules apps/web/dist apps/web/storybook-static
