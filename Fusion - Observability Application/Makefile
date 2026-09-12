COMPOSE ?= docker compose
.PHONY: help up down build logs ps restart clean smoke token load
help:
	@echo "make up      - build + start stack"
	@echo "make down    - stop stack"
	@echo "make logs    - tail logs"
	@echo "make smoke   - API smoke test"
	@echo "make token   - fetch JWT"
	@echo "make load    - generate traffic"
	@echo "make clean   - wipe volumes"
up:      ; $(COMPOSE) up --build -d
down:    ; $(COMPOSE) down
build:   ; $(COMPOSE) build
logs:    ; $(COMPOSE) logs -f --tail=200
ps:      ; $(COMPOSE) ps
restart: ; $(COMPOSE) restart
clean:   ; $(COMPOSE) down -v --remove-orphans
smoke:
	@curl -fsS http://localhost:8000/health/live && echo
	@curl -fsS http://localhost:8000/health/ready && echo
token:
	@curl -s -X POST http://localhost:8000/api/v1/auth/token \
	  -H 'Content-Type: application/json' \
	  -d '{"username":"admin","password":"admin123"}'
load:
	@TOKEN=$$(curl -s -X POST http://localhost:8000/api/v1/auth/token \
	  -H 'Content-Type: application/json' \
	  -d '{"username":"admin","password":"admin123"}' \
	  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'); \
	echo "Traffic loop running (Ctrl+C to stop)..."; \
	while true; do \
	  curl -s -o /dev/null -H "Authorization: Bearer $$TOKEN" http://localhost:8000/api/v1/items; \
	  curl -s -o /dev/null -X POST -H "Authorization: Bearer $$TOKEN" \
	    -H 'Content-Type: application/json' \
	    -d '{"name":"widget","value":42}' \
	    http://localhost:8000/api/v1/items; \
	  curl -s -o /dev/null -H "Authorization: Bearer $$TOKEN" \
	    "http://localhost:8000/api/v1/admin/simulate/latency?ms=250"; \
	  curl -s -o /dev/null -H "Authorization: Bearer $$TOKEN" \
	    "http://localhost:8000/api/v1/admin/simulate/error?rate=0.2" || true; \
	done
