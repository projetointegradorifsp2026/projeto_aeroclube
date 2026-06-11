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
APPS = users relatorios pessoas carteira titulos_pagar titulos_receber aeronaves voos conta_fixa

# .PHONY declara que estes alvos não são arquivos reais
.PHONY: help dev-up dev-down dev-logs test test-down prod-up prod-down \
        migrate makemigrations shell createsuperuser loaddata logs-be logs-fe ps clean

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
	@echo "    make prod-up         Sobe o ambiente de produção (background)"
	@echo "    make prod-down       Derruba o ambiente de produção"
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
# -d (detached): roda em background
prod-up:
	docker compose -f $(BASE) -f $(PROD) up --build -d

prod-down:
	docker compose -f $(BASE) -f $(PROD) down

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