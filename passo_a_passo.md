# 1. Suba o ambiente

```bash

make dev-up

```
# 2. Aplique as migrations (em outro terminal)

```bash

make makemigrations
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
