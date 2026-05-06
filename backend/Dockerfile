# =============================================================================
# Backend — Django REST Framework
# Multi-stage: dev (runserver) | production (gunicorn)
# =============================================================================

# ── Estágio base (compartilhado) ─────────────────────────────────────────────
FROM python:3.12-slim AS base

# Evita arquivos .pyc e garante logs imediatos no terminal
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependências de sistema necessárias para mysqlclient
RUN apt-get update && apt-get install -y --no-install-recommends \
        default-libmysqlclient-dev \
        gcc \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Instala dependências Python
COPY requirements/base.txt requirements/base.txt
RUN pip install --no-cache-dir -r requirements/base.txt

# ── Estágio de desenvolvimento ────────────────────────────────────────────────
FROM base AS dev

# Em dev o código é montado via volume, mas copiamos para ter fallback
COPY . .

EXPOSE 8000

# runserver com reload automático
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ── Estágio de produção ───────────────────────────────────────────────────────
FROM base AS production

COPY . .

# Coleta arquivos estáticos
RUN python manage.py collectstatic --noinput --settings=config.settings.prod || true

EXPOSE 8000

# Gunicorn é iniciado pelo docker-compose.prod.yml via `command:`
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
