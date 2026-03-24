# Aeroclube — Configuração Docker

## Estrutura

```
aeroclube/
├── frontend/
│   ├── Dockerfile          # Multi-stage: dev / production
│   ├── nginx.spa.conf      # Nginx interno do frontend (SPA routing)
│   └── .dockerignore
├── backend/
│   ├── Dockerfile          # Multi-stage: dev / production
│   └── .dockerignore
├── nginx/
│   └── nginx.conf          # Reverse proxy (apenas produção)
├── docker-compose.yml      # BASE — comum a todos os ambientes
├── docker-compose.dev.yml  # Override — desenvolvimento
├── docker-compose.test.yml # Override — testes
├── docker-compose.prod.yml # Override — produção
├── .env.example            # Template de variáveis (commitar isso)
├── .env                    # Variáveis reais (NÃO commitar)
└── Makefile                # Atalhos de comandos
```

## Primeiros Passos

```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd aeroclube

# 2. Crie o arquivo de variáveis de ambiente
cp .env.example .env
# Edite o .env com seus valores

# 3. Suba o ambiente de desenvolvimento
make dev-up

# 4. Em outro terminal, aplique as migrations
make migrate

# 5. Crie um superusuário para o Django Admin
make createsuperuser
```

## Acesso local (desenvolvimento)

| Serviço      | URL                         |
| ------------ | --------------------------- |
| Frontend     | http://localhost:3000       |
| Backend API  | http://localhost:8000/api/  |
| Django Admin | http://localhost:8000/admin |
| MariaDB      | localhost:3306              |

## Comandos mais usados

```bash
make dev-up          # sobe ambiente dev (com build)
make dev-down        # derruba ambiente dev
make test            # roda os testes (CI/CD)
make prod-up         # sobe produção em background
make migrate         # aplica migrations
make makemigrations  # gera novas migrations
make shell           # shell do Django
make help            # lista todos os comandos
```

## Arquitetura dos Ambientes

```
dev:   frontend:3000 ←→ backend:8000 ←→ db:3306

test:  backend ←→ db_test (RAM/tmpfs)

prod:  internet → nginx:80 → frontend:80 (static)
                           → backend:8000 (gunicorn)
                             ↕
                           db:3306 (volume persistente)
```
