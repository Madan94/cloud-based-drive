# ==============================================================================
# WINDOWS-NATIVE DEVELOPMENT MAKEFILE
# ==============================================================================

SHELL := powershell.exe
.SHELLFLAGS := -NoProfile -Command

# ------------------------------------------------------------------------------
# VARIABLES

BOLD :=
RESET :=
GREEN :=

# -- Database
DB_HOST = postgresql
DB_PORT = 5432

# -- Docker
DOCKER_UID = 1000
DOCKER_GID = 1000
DOCKER_USER = $(DOCKER_UID):$(DOCKER_GID)

COMPOSE = docker compose
COMPOSE_EXEC = $(COMPOSE) exec
COMPOSE_EXEC_APP = $(COMPOSE_EXEC) app-dev
COMPOSE_RUN = $(COMPOSE) run --rm
COMPOSE_RUN_APP = $(COMPOSE_RUN) app-dev
COMPOSE_RUN_CROWDIN = $(COMPOSE_RUN) crowdin crowdin

# -- Backend
MANAGE = $(COMPOSE_RUN_APP) python manage.py
MANAGE_EXEC = $(COMPOSE_EXEC_APP) python manage.py
MAIL_YARN = $(COMPOSE_RUN) -w /app/src/mail node yarn
PSQL_E2E = ./bin/postgres_e2e

# -- Frontend
PATH_FRONT = ./src/frontend
PATH_FRONT_DRIVE = ./src/frontend/apps/drive

# ==============================================================================
# RULES

default: help

# ------------------------------------------------------------------------------
# Filesystem

data/media:
	@if (!(Test-Path "data/media")) { New-Item -ItemType Directory -Force "data/media" | Out-Null }

data/static:
	@if (!(Test-Path "data/static")) { New-Item -ItemType Directory -Force "data/static" | Out-Null }

# ------------------------------------------------------------------------------
# Project

create-env-local-files:
	@New-Item -ItemType File -Force env.d/development/crowdin.local | Out-Null
	@New-Item -ItemType File -Force env.d/development/common.local | Out-Null
	@New-Item -ItemType File -Force env.d/development/postgresql.local | Out-Null
	@New-Item -ItemType File -Force env.d/development/kc_postgresql.local | Out-Null
.PHONY: create-env-local-files

bootstrap: data/media data/static create-env-local-files build migrate back-i18n-compile mails-install mails-build run
.PHONY: bootstrap

# ------------------------------------------------------------------------------
# Docker / Compose

build:
	@$(MAKE) build-backend
	@$(MAKE) build-frontend
.PHONY: build

build-backend:
	@$(COMPOSE) build app-dev
.PHONY: build-backend

build-frontend:
	@$(COMPOSE) build frontend-dev
.PHONY: build-frontend

down:
	@$(COMPOSE) down
	@if (Test-Path "data") { Remove-Item -Recurse -Force data/postgresql* -ErrorAction SilentlyContinue }
.PHONY: down

logs:
	@$(COMPOSE) logs -f app-dev
.PHONY: logs

run-backend:
	@$(COMPOSE) up --force-recreate -d celery-dev
	@$(COMPOSE) up --force-recreate -d nginx
	@$(MAKE) configure-wopi
.PHONY: run-backend

run:
	@$(MAKE) run-backend
	@$(COMPOSE) up --force-recreate -d frontend-dev
.PHONY: run

status:
	@$(COMPOSE) ps
.PHONY: status

stop:
	@$(COMPOSE) stop
.PHONY: stop

# ------------------------------------------------------------------------------
# Backend

makemigrations:
	@$(COMPOSE) up -d postgresql
	@$(MANAGE) makemigrations
.PHONY: makemigrations

migrate:
	@$(COMPOSE) up -d postgresql
	@$(MANAGE) migrate
.PHONY: migrate

superuser:
	@$(MANAGE) createsuperuser --email admin@example.com --password admin
.PHONY: superuser

configure-wopi:
	@$(MANAGE) trigger_wopi_configuration
.PHONY: configure-wopi

back-i18n-compile:
	@$(MANAGE) compilemessages --ignore="venv/**/*"
.PHONY: back-i18n-compile

back-i18n-generate:
	@$(MANAGE) makemessages -a --keep-pot --all
.PHONY: back-i18n-generate

shell:
	@$(MANAGE) shell
.PHONY: shell

# ------------------------------------------------------------------------------
# Database

dbshell:
	@$(COMPOSE_EXEC_APP) python manage.py dbshell
.PHONY: dbshell

resetdb:
	@$(MANAGE) flush
	@$(MAKE) superuser
.PHONY: resetdb

# ------------------------------------------------------------------------------
# Internationalization

crowdin-download:
	@$(COMPOSE_RUN_CROWDIN) download -c crowdin/config.yml
.PHONY: crowdin-download

crowdin-upload:
	@$(COMPOSE_RUN_CROWDIN) upload sources -c crowdin/config.yml
.PHONY: crowdin-upload

i18n-compile: back-i18n-compile frontend-i18n-compile
.PHONY: i18n-compile

i18n-generate: back-i18n-generate frontend-i18n-generate
.PHONY: i18n-generate

# ------------------------------------------------------------------------------
# Mail

mails-install:
	@$(MAIL_YARN) install
.PHONY: mails-install

mails-build:
	@$(MAIL_YARN) build
.PHONY: mails-build

# ------------------------------------------------------------------------------
# Misc

clean:
	git clean -idx
.PHONY: clean

clean-media:
	@if (Test-Path "data/media") { Remove-Item -Recurse -Force data/media/* }
.PHONY: clean-media

help:
	@Write-Host ""
	@Write-Host "Available targets:"
	@Select-String "##" Makefile | ForEach-Object {
		$line = $_.Line
		$parts = $line -split "##"
		if ($parts.Length -eq 2) {
			Write-Host ("{0,-30} {1}" -f $parts[0].Trim(), $parts[1].Trim())
		}
	}
.PHONY: help

# ------------------------------------------------------------------------------
# Frontend

frontend-development-install:
	cd $(PATH_FRONT_DRIVE); yarn
.PHONY: frontend-development-install

frontend-lint:
	cd $(PATH_FRONT); yarn lint
.PHONY: frontend-lint

run-frontend-development:
	@$(COMPOSE) stop frontend-dev
	cd $(PATH_FRONT_DRIVE); yarn dev
.PHONY: run-frontend-development

frontend-i18n-extract:
	cd $(PATH_FRONT); yarn i18n:extract
.PHONY: frontend-i18n-extract

frontend-i18n-generate: crowdin-download frontend-i18n-extract
.PHONY: frontend-i18n-generate

frontend-i18n-compile:
	cd $(PATH_FRONT); yarn i18n:deploy
.PHONY: frontend-i18n-compile
