# =============================================================================
# Makefile — Atalhos para comandos Docker frequentes
# =============================================================================
# Por que Makefile?
#   Os comandos docker compose com múltiplos arquivos (-f) são verbosos.
#   O Makefile centraliza esses comandos e serve como documentação viva
#   do que é possível fazer no projeto.
#
# Como usar: make <comando>
#   Ex: make dev-up
#
# Requisito: GNU Make instalado (padrão no Linux/Mac; no Windows use WSL2)
# =============================================================================

# Variáveis dos arquivos de compose
BASE     = docker-compose.yml
DEV      = docker-compose.dev.yml
TEST     = docker-compose.test.yml
PROD     = docker-compose.prod.yml
APPS = users relatorios pessoas carteira titulos_pagar titulos_receber aeronaves voos conta_fixa permissoes

# Lista COMPLETA de apps do projeto — usada no makemigrations de PRODUÇÃO.
# Necessária porque 'migrations/' está no .gitignore: a imagem de prod não traz
# os arquivos de migration, então é preciso gerá-los nomeando cada app
# explicitamente (makemigrations sem argumentos ignora apps sem pasta migrations/).
PROD_APPS = users pessoas aeronaves voos titulos_pagar titulos_receber carteira conta_fixa receitas custos cnab relatorios permissoes

# Atalho para os comandos de produção (compose base + prod)
PRODC = docker compose -f $(BASE) -f $(PROD)

# .PHONY declara que estes alvos não são arquivos reais
.PHONY: help dev-up dev-down dev-logs test test-down prod-up prod-down \
        migrate makemigrations shell createsuperuser loaddata logs-be logs-fe ps clean \
        prod-logs prod-ps prod-migrate prod-makemigrations prod-migrations \
        prod-loaddata prod-clean prod-reset prod-superuser prod-shell

# -----------------------------------------------------------------------------
# Ajuda — lista todos os comandos disponíveis
# -----------------------------------------------------------------------------
help:
	@echo ""
	@echo "  Aeroclube — Comandos Docker"
	@echo "  ─────────────────────────────────────────"
	@echo "  Desenvolvimento:"
	@echo "    make dev-up          Sobe o ambiente de desenvolvimento"
	@echo "    make dev-down        Derruba o ambiente de desenvolvimento"
	@echo "    make dev-logs        Acompanha os logs em tempo real (dev)"
	@echo ""
	@echo "  Testes:"
	@echo "    make test            Roda os testes do backend"
	@echo "    make test-down       Remove containers de teste"
	@echo ""
	@echo "  Produção:"
	@echo "    make prod-up           Sobe produção (build + background)"
	@echo "    make prod-down         Derruba produção (mantém o banco)"
	@echo "    make prod-reset        Reset total: zera banco, migra e popula seed"
	@echo "    make prod-clean        Apaga o volume do banco de produção"
	@echo "    make prod-migrations   Gera + aplica migrations no prod"
	@echo "    make prod-loaddata     Popula o prod com seed_data.json"
	@echo "    make prod-superuser    Cria superusuário no prod"
	@echo "    make prod-logs / prod-ps / prod-shell"
	@echo ""
	@echo "  Django:"
	@echo "    make migrate         Aplica migrations"
	@echo "    make makemigrations  Gera novas migrations"
	@echo "    make shell           Shell interativo do Django"
	@echo "    make createsuperuser Cria superusuário admin"
	@echo "    make loaddata        Popula o banco com entidades de exemplo (seed_data.json)"
	@echo ""
	@echo "  Utilitários:"
	@echo "    make logs-be         Logs do backend (dev)"
	@echo "    make logs-fe         Logs do frontend (dev)"
	@echo "    make ps              Lista containers rodando"
	@echo "    make clean           Remove containers, volumes e imagens do projeto"
	@echo ""

# -----------------------------------------------------------------------------
# Desenvolvimento
# -----------------------------------------------------------------------------
dev-up-build:
	docker compose -f $(BASE) -f $(DEV) up --build

dev-up:
	docker compose -f $(BASE) -f $(DEV) up

dev-down:
	docker compose -f $(BASE) -f $(DEV) down

dev-logs:
	docker compose -f $(BASE) -f $(DEV) logs -f

# -----------------------------------------------------------------------------
# Testes
# -----------------------------------------------------------------------------
# --abort-on-container-exit: derruba tudo quando o backend terminar os testes
# --exit-code-from backend: o exit code do make será o dos testes (0=ok, 1=falha)
# Isso é essencial para o Jenkins saber se o build passou ou não
test:
	docker compose -f $(BASE) -f $(TEST) up --build \
		--abort-on-container-exit \
		--exit-code-from backend

test-down:
	docker compose -f $(BASE) -f $(TEST) down

# -----------------------------------------------------------------------------
# Produção
# -----------------------------------------------------------------------------
# IMPORTANTE: os alvos de produção SEMPRE usam os arquivos de compose de prod
# (base + prod). Os alvos genéricos (migrate, makemigrations, clean) apontam para
# o ambiente DEV e NÃO afetam o banco/volume de produção (db_data_prod) — por isso
# 'make clean' no servidor não zera o banco de prod.
#
# Por que prod precisa de makemigrations? As migrations estão no .gitignore, então
# não vêm no repositório nem na imagem. É preciso gerá-las dentro do container
# (nomeando cada app em PROD_APPS) antes de aplicar. Como o backend de prod não
# tem bind-mount do código, esses arquivos são efêmeros: gere e aplique na mesma
# vida do container, sem rebuild entre os passos.

# Sobe produção (build + background)
prod-up:
	$(PRODC) up --build -d

# Derruba produção (mantém o volume do banco)
prod-down:
	$(PRODC) down

# Logs de produção em tempo real
prod-logs:
	$(PRODC) logs -f

# Lista containers de produção
prod-ps:
	$(PRODC) ps

# Gera as migrations de TODAS as apps dentro do container de prod
prod-makemigrations:
	$(PRODC) exec -T backend python manage.py makemigrations $(PROD_APPS)

# Aplica as migrations no banco de produção
prod-migrate:
	$(PRODC) exec -T backend python manage.py migrate

# Gera + aplica as migrations (atalho)
prod-migrations: prod-makemigrations prod-migrate

# Popula o banco de produção com o seed
prod-loaddata:
	$(PRODC) exec -T backend python manage.py loaddata seed_data.json

# CUIDADO: derruba prod e APAGA o volume do banco de produção (db_data_prod)
prod-clean:
	$(PRODC) down -v
	@echo "Volume db_data_prod removido. Rode 'make prod-reset' para recriar do zero."

# Reset COMPLETO de produção: zera o banco, sobe, gera/aplica migrations e popula.
# Tudo na mesma vida do container, pois as migrations geradas são efêmeras.
prod-reset:
	$(PRODC) down -v
	$(PRODC) up -d --build --wait
	$(PRODC) exec -T backend python manage.py makemigrations $(PROD_APPS)
	$(PRODC) exec -T backend python manage.py migrate
	$(PRODC) exec -T backend python manage.py loaddata seed_data.json
	@echo "Producao resetada: banco recriado, migrado e populado com seed_data.json"

# Cria superusuário em produção (interativo)
prod-superuser:
	$(PRODC) exec backend python manage.py createsuperuser

# Shell do Django em produção
prod-shell:
	$(PRODC) exec backend python manage.py shell

# -----------------------------------------------------------------------------
# Django — comandos de gerenciamento (sempre no ambiente dev)
# -----------------------------------------------------------------------------
migrate:
	docker compose -f $(BASE) -f $(DEV) exec backend python manage.py migrate


makemigrations:
	docker compose -f $(BASE) -f $(DEV) exec backend python manage.py makemigrations
	@for app in $(APPS); do \
		docker compose exec backend python manage.py makemigrations $$app; \
	done

shell:
	docker compose -f $(BASE) -f $(DEV) exec backend python manage.py shell

createsuperuser:
	docker compose -f $(BASE) -f $(DEV) exec backend python manage.py createsuperuser

# Popula o banco com entidades de exemplo (clientes, alunos, sócios, instrutores,
# fornecedores, funcionários, contas fixas) a partir de backend/seed_data.json.
loaddata:
	docker compose -f $(BASE) -f $(DEV) exec backend python manage.py loaddata seed_data.json

# -----------------------------------------------------------------------------
# Logs individuais (desenvolvimento)
# -----------------------------------------------------------------------------
logs-be:
	docker compose -f $(BASE) -f $(DEV) logs -f backend

logs-fe:
	docker compose -f $(BASE) -f $(DEV) logs -f frontend

# -----------------------------------------------------------------------------
# Utilitários
# -----------------------------------------------------------------------------
ps:
	docker compose -f $(BASE) -f $(DEV) ps

# CUIDADO: remove tudo, incluindo volumes (dados do banco serão apagados)
clean:
	docker compose -f $(BASE) -f $(DEV) down -v --rmi local
	@echo "Containers, volumes e imagens locais removidos."
	docker compose down -v