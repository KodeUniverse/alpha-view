.PHONY: build start stop

build:
	docker compose up --build --force-recreate --no-start

start:
	docker compose up --watch 

stop:
	docker compose stop
clean:
	docker compose down

restart: clean build start

connect_db: 
	docker exec -it alpha-view-postgres-1 psql -U postgres -d alpha_view
delete_db:
	docker volume rm alpha-view_postgres_data
	docker volume prune
