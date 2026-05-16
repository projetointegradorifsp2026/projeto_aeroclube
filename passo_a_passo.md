# 1. Suba o ambiente

```bash

make dev-up

```
# 2. Aplique as migrations (em outro terminal)

```bash

make makemigrations
docker compose exec backend python manage.py makemigrations users
docker compose exec backend python manage.py makemigrations relatorios
docker compose exec backend python manage.py makemigrations pessoas
docker compose exec backend python manage.py makemigrations carteira
docker compose exec backend python manage.py makemigrations titulos_pagar
docker compose exec backend python manage.py makemigrations titulos_receber
docker compose exec backend python manage.py makemigrations aeronaves
docker compose exec backend python manage.py makemigrations voos
make migrate

```
# 3. Crie o superusuário

```bash

make createsuperuser

```
# 4. Teste a API

```bash

curl -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aeroclube.com","password":"suasenha"}'
  
 ```
