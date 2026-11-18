#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v initdb >/dev/null || { echo 'Install PostgreSQL 16+ first, or use docker compose up -d.'; exit 1; }
if [[ ! -f .env ]]; then
  node -e 'const fs=require("fs"),crypto=require("crypto");fs.writeFileSync(".env",fs.readFileSync(".env.example","utf8").replace("replace-with-a-random-secret-of-at-least-32-characters",crypto.randomBytes(32).toString("hex")).replace("replace-with-another-random-secret-of-at-least-32-characters",crypto.randomBytes(32).toString("hex")).replace("@localhost:5432/","@localhost:54329/"));'
fi
if [[ ! -d .local-postgres ]]; then initdb -D .local-postgres -U green_dhaka -A trust --no-locale -E UTF8; fi
if ! pg_ctl -D .local-postgres status >/dev/null 2>&1; then pg_ctl -D .local-postgres -l postgres.log -o '-h 127.0.0.1 -p 54329 -k /tmp' start; fi
if ! psql -h 127.0.0.1 -p 54329 -U green_dhaka -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='green_dhaka'" | rg -q 1; then createdb -h 127.0.0.1 -p 54329 -U green_dhaka green_dhaka; fi
npm run db:generate
npm run db:deploy
npm run db:seed
printf '\nLocal database ready on 127.0.0.1:54329. Run npm run dev.\n'
