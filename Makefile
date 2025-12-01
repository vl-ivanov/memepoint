.PHONY: all

up:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

down:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down

clean:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v

build:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

seed:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml exec frontend node seeds/index.js
