.PHONY: build start stop clean restart

build:
	docker compose up --build --force-recreate --no-start

start:
	docker compose up --watch 

stop:
	docker compose stop
clean:
	docker compose down

restart: clean build start
