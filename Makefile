.PHONY: build start stop

build:
	docker compose up --build --force-recreate --no-start

start:
	docker compose --verbose up

stop:
	docker compose stop
clean:
	docker compose down
