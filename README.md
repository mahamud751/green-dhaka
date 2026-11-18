# Green Dhaka

A React Native **Community CLI** app and a NestJS API, built from the DOCX and nine reference images in `info/`. Seller and partner experiences share the mobile binary, selected by the authenticated account role. A responsive admin web panel is served by the backend.

```
app/       React Native 0.84 · TypeScript · Android + iOS native projects
backend/   NestJS 11 · Prisma 6 · PostgreSQL · Swagger · admin web panel
info/      Original requirements and visual references, unchanged
```

## Start the backend

Node 22.11+ and PostgreSQL 16+ are required. The local database created during development is isolated in `backend/.local-postgres`, on **port 54329**, and does not modify another PostgreSQL installation.

```sh
cd backend
npm ci
bash scripts/setup-local.sh
npm run dev
```

The script generates random development secrets, initializes PostgreSQL, applies the checked-in migration, and seeds launch areas and **demo prices**. It binds the database to localhost, with trust authentication for local development only. It needs PostgreSQL's `initdb`, `pg_ctl`, `createdb`, `psql`, and `rg` on PATH. If `.env` already exists, it preserves that file; ensure `DATABASE_URL` points at the intended database.

If using an existing PostgreSQL server instead:

```sh
cd backend
cp .env.example .env
# Set DATABASE_URL and replace BOTH secrets with random values, >=32 characters.
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Docker is also supported: `cd backend && docker compose up -d`, then use the URL in `.env.example` (port 5432), generate the client, deploy migrations and seed.

- API health: http://localhost:3000/health
- Interactive Swagger: http://localhost:3000/docs
- OpenAPI JSON: http://localhost:3000/docs-json
- Admin panel: http://localhost:3000/admin-panel/

The API and isolated PostgreSQL were started during implementation. To stop the isolated database: `cd backend && pg_ctl -D .local-postgres stop`. Start it again with the setup script. Don't delete `.local-postgres` unless you intend to erase the development database.

## Start the mobile app

```sh
cd app
npm ci
npm start
# In another terminal, with an Android emulator or USB device connected:
cd app
npm run android
```

This is a native CLI project, **not Expo**. Use JDK 17, Android Studio, SDK 36 and the SDK tools specified by the checked-in Gradle project. Follow the [official native environment setup](https://reactnative.dev/docs/0.84/set-up-your-environment) if needed.

The app's **You → Connection settings** sets the API URL:

| Device | API URL |
| --- | --- |
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |
| Physical phone | `http://YOUR_COMPUTER_LAN_IP:3000`, same Wi-Fi |
| USB Android with `adb reverse tcp:3000 tcp:3000` | `http://localhost:3000` |

Changing the API server signs out the current account. HTTP is allowed by the Android debug build for local development. Use HTTPS for production.

For iOS: `cd app && bundle install && cd ios && bundle exec pod install`, then `cd .. && npm run ios`. Native iOS project and photo-library permission are included; no App Store signing or iOS device verification has been performed.

## Development sign-in

Request a code, then enter `DEV_OTP` from `backend/.env` (default **123456**). This mode sends **no SMS**. The UI explicitly labels it as local development.

| Role | Phone | Behaviour |
| --- | --- | --- |
| Seller | `+8801712345678` | Nafisa Rahman, a saved Dhanmondi test address |
| Partner | `+8801800000000` | Rakib Hasan, demo-approved, initially offline |
| Admin | `+8801700000000` | Admin web panel access |
| New seller | Any valid `+8801…` Bangladesh number | Created after OTP verification |

Demo accounts are **not created when NODE_ENV=production**. Admin roles are assigned only in the database, never from the login request.

To try the complete flow:

1. Sign in as the partner on a second emulator/device, go online in Dhanmondi.
2. As seller, choose materials, enter quantities totaling at least ৳100, confirm address and book.
3. Accept the partner offer within 20 seconds; depart, arrive, enter digital scale quantities.
4. Seller reviews final weights and payout and approves them.
5. Partner pays cash; seller shares the 4-digit handover OTP; partner verifies it and completes.
6. Seller opens the invoice, shares its text or downloads the PDF, and rates the partner.

The admin can also manually assign an approved partner. Scheduled requests enter dispatch 90 minutes before their slot. Without an available partner, instant search tries partners sequentially, expands from 3 km to 5 km after 3 minutes, and offers scheduling after 5 minutes.

## Implemented

- Phone OTP auth, resend delay, persisted failed-attempt lockout; secure mobile token storage.
- English/Bangla seller interface, original SVG material illustrations, responsive layouts, offline rate cache; online rates refresh every 45 seconds.
- Dhaka launch zones and coordinate validation, saved addresses, out-of-area waitlist.
- Catalogue search and filtering; per-area, per-subtype, kg/piece rates with timestamps and admin change history.
- Material quantities, notes, up to five protected photos, live estimated payout and fee progress.
- Instant/scheduled bookings, 2-hour Dhaka slots up to 7 days, server-locked rates and minimum value.
- Persistent, database-backed dispatch offers, atomic acceptance, partner status transitions and tracking polls.
- Private OTP storage, seller-only OTP display, >25% weight-difference warning, seller weight approval, cash confirmation, one-use OTP settlement.
- Final invoices with itemized locked rates, quantities, fee, credit and payout; text sharing and downloadable English PDF via 5-minute invoice-only signed links.
- Upcoming/completed/cancelled orders, reorder, cancellation reasons and fee rules, disputes and admin reopening/resolution.
- Partner onboarding, private NID/portrait uploads, admin approval/suspension, online/location updates, offers, navigation, settlement history and two-way ratings.
- Referral and fee-only credit ledger, reservations, adjustment/refund on final weighing, reward after first pickup with device/address checks when device data exists.
- Admin dashboard, orders/reassignment, catalogue, rates/history, partners/private verification documents, credits, waitlist, configuration (including pickup slot hours and booking horizon) and audit history.
- Partner commission: a global percent with optional per-category overrides set in the admin catalogue.
- Product analytics: the 14 PRD events (app_open … rating_submitted) are sent from the app with order, area and app version.
- In-app notification inbox and persistent notification outbox; optional webhook delivery adapter.
- Swagger request schemas, validation, bearer auth, role/ownership checks, helmet headers, local migrations and business/API tests.

## Integrations and limits

This is a working local implementation, not an already commissioned production service. [Requirement coverage](backend/docs/requirements-coverage.md) records the exact boundaries.

- **Real SMS / background push:** configure a Bangladesh SMS gateway and an authenticated notification adapter for FCM/SMS. Inbox updates work locally; delivery to a closed phone needs that adapter and push registration integration.
- **GPS / live map / ETA:** addresses and partner positions currently use entered coordinates; external navigation works. Continuous device GPS, an embedded live map, traffic-aware routing and masked telephony require provider setup and native integration. ETA labels are explicitly estimates.
- **Prices:** all seeded prices are labelled demo values, not surveyed Dhaka market prices. Publish verified rates and turn off `ratesAreDemo` in admin before launch.
- **Support:** set real phone/WhatsApp numbers in admin. No invented contact numbers are displayed.
- **Partner identity:** document upload is private; an admin must actually verify identity and scale calibration. Demo partner approval is only for testing.
- **Commission:** a global percent with per-category overrides. Commission due is calculated from current category settings; immutable per-order commission snapshots are not implemented. Resale revenue is not collected, so the app does not mislabel cash paid to sellers as partner profit.
- **Storage:** photos and identity documents are protected API downloads stored on local disk. Use durable encrypted object storage and backups in production.
- **Invoice PDF:** English/ASCII PDF; the in-app invoice supports Bangla. PDF download links contain transaction/address information and expire in 5 minutes.
- **Cancellation fee:** ৳30 is recorded after the two free monthly late cancellations. Automated collection is not included in cash-only MVP.
- **Referral abuse prevention:** the app sends a random per-install ID kept in the device keychain; the server stores only its hash and also checks matching addresses. It is not a hardware fingerprint: reinstalling on Android creates a new ID.
- **Account deletion:** deactivates the account and removes profile/address/identity information; phone and financial transaction records remain for accounting and anti-abuse. Set a reviewed retention policy before public launch.
- **Analytics:** events are stored in PostgreSQL (`AnalyticsEvent`); export to an analytics provider is not configured.
- **Production rollout:** configure TLS, SMS credentials, notification delivery, real support contacts, production rate survey, database/object-storage encryption and backups, retention, monitoring and release signing. No uptime, APK-size, market-survey, identity-verification or legal-compliance guarantees are claimed.
- Wallet cash-out, bKash/Nagad, recurring pickups, bulk B2B, vehicles/appliances and sponsored gifts remain outside the DOCX MVP.

## Production release (Android)

- **API:** release builds always use `https://greendhaka.crazysolve.com` (HTTPS only; plain HTTP is blocked in release). Debug builds use the local server and keep **You → Connection settings**, which is hidden in release.
- **Sign-in in production** sends real SMS: the server needs `SMS_GATEWAY_URL` and `SMS_GATEWAY_TOKEN`, and must not set `DEV_OTP`.
- **Signing key:** `app/android/app/green-dhaka-release.keystore` with passwords in `app/android/keystore.properties`. Both are git-ignored. **Back them up somewhere safe**: every future update must be signed with this same key. Release builds stop with an error if the key is missing; they never fall back to the debug key.
- **Build:**

```sh
cd app/android
./gradlew assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64
```

Output in `app/android/app/build/outputs/apk/release/`: `app-arm64-v8a-release.apk` (most phones), `app-armeabi-v7a-release.apk` (older 32-bit phones), `app-x86_64-release.apk` (emulators) and `app-universal-release.apk` (runs on all). Release APKs bundle the JavaScript and don't need Metro. Bump `versionCode` and `versionName` in `app/android/app/build.gradle` and `APP_VERSION` in `app/src/api.ts` for each new release.

- **Brand assets:** logo SVG and 512/1024 px store icons are in `app/docs/logo/`. Android uses vector adaptive icons and a branded launch screen.

## Verification

```sh
cd backend
npm run build
npm test
# Start API + seeded local DB first. Creates test users/orders; restores changed rate.
npm run test:e2e
cd ../app
npx tsc --noEmit
npm run lint -- --quiet
npm test -- --runInBand
```

The native debug APK is built with `cd app/android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64` for emulator testing. For physical phones, build `arm64-v8a` or all needed architectures. A debug APK needs Metro; don't distribute it as a production release. Generate your own release key and configure secure signing before shipping.

Backend versions are intentionally pinned to Prisma 6.19 with patched tooling overrides; both migrations and client generation are verified together. Never commit `.env`, uploaded identity documents, database files or release keys.
