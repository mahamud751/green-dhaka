# Green Dhaka backend

NestJS, Prisma, PostgreSQL, Swagger and the admin web panel. Run all commands from this directory.

```sh
npm ci
bash scripts/setup-local.sh
npm run dev
```

Full configuration, alternate database setup, accounts and deployment boundaries are in [the root README](../README.md). Swagger: `/docs`. Admin UI: `/admin-panel/`. Health: `/health`.

- `src/auth.ts`: OTP, JWT and roles.
- `src/market.ts`: catalogue, rates, areas, addresses, credit, referrals, inbox.
- `src/orders.ts`: booking, photos, seller review, cancellation, invoices, ratings.
- `src/partner.ts`: onboarding, online status, offers, job transitions, weighing and cash settlement.
- `src/verification.ts`: private NID and portrait storage/downloads.
- `src/dispatch.ts`: durable timed offers and notification outbox.
- `src/admin.ts`: dashboard, KYC, pricing, catalogue, assignment, dispute/credit/configuration and audits.
- `src/receipts.ts`, `src/pdf.ts`: limited signed invoice downloads.
- `src/rules.ts`: fee, rounding, distance, slot and cryptographic helpers.
- `prisma/schema.prisma`: relational model, constraints and indexes.
- `prisma/migrations`: reproducible schema history.
- `public`: browser admin UI; access token lives only in memory.
- `test`: business rules and local PostgreSQL integration tests.

```sh
npm run build
npm test
npm run test:e2e  # requires the running API and a seeded demo DB
```

Production rejects fixed development OTP and requires a real SMS gateway. Never deploy the local trust-auth PostgreSQL cluster or demo accounts.
