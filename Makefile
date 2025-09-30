.PHONY: build start stop

build:
	docker compose up --no-start

start:
	docker compose --verbose up

stop:
	docker compose stop
clean:
	docker compose down
