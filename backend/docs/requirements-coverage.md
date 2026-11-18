# Requirement coverage and implementation decisions

Source: `info/Green Dhaka – Product Requirements Document (v3, for CTO).docx`. User override: React Native Community CLI replaces Flutter; NestJS + Prisma + local PostgreSQL are required. Exactly two implementation directories: `app` and `backend`; the admin web assets live in `backend/public`.

| Requirement | Coverage |
| --- | --- |
| AUTH-1 | Phone OTP, 30-second resend, 5-minute expiry, 5-attempt / 15-minute lock. Fixed local OTP only in development. SMS gateway adapter requires credentials in production. |
| AUTH-2 | Name, language, account deactivation and profile/address cleanup. Financial records and phone retained; retention policy needs business review. |
| ADDR-1 | Saved addresses with area, house/floor, landmark, coordinates; area-radius validation; waitlist. Coordinates are entered manually; automatic native GPS remains an integration. |
| RATE-1/2 | Search/filter, area/category/subtype/kg/piece, timestamps, append-only history, offline cache, online refresh every 45 seconds. Prices are demo data. |
| BOOK-1/2/3/4 | Multiple materials, subtype, quantity, notes, five protected images, live estimate, fee progress, instant/scheduled two-hour slots, 7-day horizon, disclaimer, transactionally locked rates. |
| DISP-1 | PostgreSQL-backed durable offers every 3 seconds; 20-second sequential acceptance; 3/5 km radii, expansion at 3 minutes, fallback after 5. Restart reconstructs state from DB. |
| DISP-2 | Scheduled dispatch within 90 minutes of slot; zone/online/busy checks; admin assignment. Detailed partner calendars not implemented. |
| TRK-1 | Partner name, portrait, rating, milestones, estimate and support-mediated contact. ETA is a labelled dispatch estimate, not a traffic-derived route. Masked telephony needs a provider. |
| TRK-2 (P1) | External navigation; manual partner coordinate updates. Embedded live map and continuous native location remain integrations. |
| HAND-1/2 | Per-order hash + authenticated encrypted OTP; seller-only display; partner weights and photos; seller final-value review and >25% warning; cash/OTP confirmation with atomic one-use settlement. |
| INV-1/2 | Itemized in-app invoice and text sharing. Downloadable English PDF via invoice-only link expiring in 5 minutes. No invented environmental impact metrics. |
| CAN-1 | Reason required. Free before departure; 2 free monthly late cancellations, then recorded ৳30 fee. Manual fee collection in cash MVP. |
| ORD-1 | Upcoming/completed/cancelled lists, detail, reorder. |
| REF-1/WAL-1 (P1) | Referral code/sharing, first-completed-pickup rewards, ledger, fee-only spending, reservations, final adjustment, cancellation release. Same-address and same-device checks; the app sends a random per-install keychain ID (hashed server-side, backfilled for existing accounts at next sign-in). Not a hardware fingerprint. |
| RAT-1 (P1) | Two-way stars; seller comment; aggregate partner rating. |
| NOT-1 | Persistent inbox/outbox with events for booking, offers, assignment, departure, arrival, weight review and completion. Optional notification webhook. Actual closed-app push, FCM token registration and SMS event delivery need integration. |
| SUP-1 | Admin-configured call/WhatsApp support. Empty until a real support contact is supplied. |
| PART-1 | Vehicle, digital-scale data, private NID/portrait upload, admin approval/suspension. Actual identity verification remains a human operation. |
| PART-2/3 | Online switch, manual location, timed offers, Google Maps navigation, guarded transitions, final weighing/OTP/cash, settlement and commission summaries. |
| ADM-1 | Category/item create/update/deactivate, units, per-area prices, change history. |
| ADM-2 | Private partner verification, approval/suspension; orders, assignment, cancellation, dispute reopen/cancel, audited credit adjustments. Financial completion is routed through seller approval and OTP rather than bypassing cash checks. |
| ADM-3 | Fee, threshold, minimum, referral, radius, global commission, support and slot configuration (first start hour, last end hour, horizon in days; default 8am–8pm, 7 days, 2-hour windows). Admin-only config read keeps commission private. |
| ADM-4 (P1) | Total/active/completed orders, completion rate, online supply and waitlist count. |
| Analytics | All 14 section-12 events sent from the app with order ID, area and app version; user ID comes from the session. Analytics-provider export remains an integration. |
| Partner commission (§6) | Global percent with optional per-category override in the admin catalogue; partner earnings show the overrides and commission due. No immutable per-order snapshot. |
| NFR | Security/ownership checks, encrypted mobile credentials, private document access, hashed OTP, admin audits. No measured 2s/4G, <40MB release, 99.5% uptime or production encryption/monitoring SLA. |

## Architectural choices

- Seller and partner modes are role-based within one native app so the requested two-folder layout remains clear. They can later be split into app flavours or separate binaries.
- Polling (5 seconds for tracking, 4 seconds for partner jobs) keeps the local system simple. PostgreSQL persists orders, offers, expired/accepted state and notification retries. Redis/WebSockets can be added for horizontal scale.
- Quantities use Decimal(10,3). Money is whole BDT. The invoice rounds the total once to the nearest taka. Credit offsets the fee only.
- Pickup estimates use the current rate; the backend revalidates and locks it at confirmation. The final fee is checked against the final weighed value.
- Partner cash-paid summaries are explicitly outflow; profit requires resale data which this system does not collect.
- Local image storage is behind role/ownership-checked endpoints. NID access is limited to the partner and admins; portrait access additionally permits that partner's booked customers.
- A 5-minute invoice-only token can download only its matching completed invoice; it cannot authenticate to other APIs.
- An administrator cannot silently bypass cash/OTP checks on a disputed order: they can cancel with credit release, or reopen weighing for the parties to settle.

## Visual interpretation

The references establish green pickup cards, material tiles, a fee-waiver bar, partner milestones, handover OTP, referral credit and invoice breakdowns. The new design uses forest green, warm off-white, mint and lime, original SVG material illustrations and consistent rounded cards. Indian currency, names, market rates, environmental claims and guaranteed weight-accuracy statements from references are not copied.
