.PHONY: build start stop

build:
	docker compose up --build --force-recreate --no-start

start:
	docker compose --verbose up

stop:
	docker compose stop
clean:
	docker compose down

restart: clean build start

connect_db: 
	docker exec -it alpha-view-postgres-1 psql -U postgres -d alpha_view
