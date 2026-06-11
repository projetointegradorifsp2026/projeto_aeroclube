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
Use **e-mail:** `admin@aeroclube.com` e **senha:** `suasenha`.

# 4. Popule o banco com entidades de exemplo (seed)

Carrega clientes, alunos, alunos externos, sócios, instrutores, sócio-instrutor,
funcionários, fornecedores e contas fixas a partir de `backend/seed_data.json`:

```bash

make loaddata

```

O que é criado:
- **11 usuários**: 3 alunos, 2 alunos externos, 2 sócios, 2 instrutores, 1 sócio-instrutor, 1 funcionário (todos com endereço completo para a remessa CNAB).
- **2 clientes**, **2 fornecedores**, **2 funcionários/instrutores (a pagar)**, **3 contas fixas**.
- A **senha de cada usuário** é `aero` + os 5 primeiros dígitos do CPF
  (ex.: João Aluno, CPF 111.444.777-35 → senha `aero11144`).

> Para regenerar o `seed_data.json` depois de alterar as entidades, use
> `manage.py dumpdata` dos models desejados (sem o usuário admin).

# 5. Teste a API

```bash

curl -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aeroclube.com","password":"suasenha"}'
  
 ```
