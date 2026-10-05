.PHONY: setup-env

setup-env:
	cp .env.example .env
	@APP_SESSION_SECRET="$$(openssl rand -hex 32)"; \
	sed -i.bak \
	  -e 's|^FRONTEND_ORIGIN=.*|FRONTEND_ORIGIN=http://YOUR_SERVER_IP:3000|' \
	  -e "s|^SESSION_SECRET=.*|SESSION_SECRET=$${APP_SESSION_SECRET}|" \
	  .env; \
	rm -f .env.bak; \
	grep '^SESSION_SECRET=' .env
