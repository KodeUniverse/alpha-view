.PHONY: build start stop

build:
	docker compose up --no-start

start:
	docker compose start

stop:
	docker compose stop
clean:
	docker compose down
