import test from "node:test";
import assert from "node:assert/strict";
import {
  totals,
  validSlot,
  weightDifference,
  distanceKm,
  hash,
  same,
  encrypt,
  decrypt,
  availableSlots,
  commissionDue,
} from "../src/rules";
process.env.OTP_SECRET = "test-secret-at-least-thirty-two-characters";
const config = { pickupFee: 40, freeThreshold: 200 };
test("pickup fee is charged below ৳200", () =>
  assert.deepEqual(totals([{ qty: 6, rate: 20 }], config), {
    value: 120,
    fee: 40,
    creditUsed: 0,
    net: 80,
  }));
test("exactly ৳200 unlocks free pickup", () =>
  assert.deepEqual(totals([{ qty: 10, rate: 20 }], config), {
    value: 200,
    fee: 0,
    creditUsed: 0,
    net: 200,
  }));
test("credit offsets the fee only", () =>
  assert.deepEqual(totals([{ qty: 6, rate: 20 }], config, 500), {
    value: 120,
    fee: 40,
    creditUsed: 40,
    net: 120,
  }));
test("free pickups never consume credit", () =>
  assert.equal(totals([{ qty: 10, rate: 20 }], config, 50).creditUsed, 0));
test("invoice is rounded once to the nearest taka", () =>
  assert.equal(
    totals(
      [
        { qty: 1.125, rate: 45 },
        { qty: 3.333, rate: 20 },
      ],
      config
    ).value,
    117
  ));
test("weight warning strictly exceeds 25%", () => {
  assert.equal(weightDifference(10, 12.5), false);
  assert.equal(weightDifference(10, 12.51), true);
  assert.equal(weightDifference(10, 7.49), true);
});
test("Dhaka schedule accepts two-hour windows, rejects half-hours, night and >7 days", () => {
  const now = new Date("2026-11-19T00:00:00Z");
  assert.equal(validSlot(new Date("2026-11-19T02:00:00Z"), now), true);
  assert.equal(validSlot(new Date("2026-11-19T02:30:00Z"), now), false);
  assert.equal(validSlot(new Date("2026-11-19T01:00:00Z"), now), false);
  assert.equal(validSlot(new Date("2026-11-19T03:00:00Z"), now), false);
  assert.equal(validSlot(new Date("2026-11-27T02:00:00Z"), now), false);
});
test("nearest partner distance is measured in km", () => {
  assert.equal(distanceKm(23.7461, 90.3742, 23.7461, 90.3742), 0);
  assert.ok(distanceKm(23.7461, 90.3742, 23.7925, 90.4078) > 5);
});
test("OTPs are hashed and encrypted, authenticated encryption rejects tampering", () => {
  const value = "4471";
  assert.ok(same(hash(value), hash(value)));
  assert.ok(!same(hash(value), hash("4472")));
  const encrypted = encrypt(value);
  assert.equal(decrypt(encrypted), value);
  assert.ok(!encrypted.includes(value));
  const damaged = Buffer.from(encrypted, "base64");
  damaged[damaged.length - 1] ^= 1;
  assert.throws(() => decrypt(damaged.toString("base64")));
});

test("admin slot configuration changes accepted hours and horizon", () => {
  const now = new Date("2026-11-19T00:00:00Z"); // 6am Dhaka
  const cfg = { slotStartHour: 10, slotEndHour: 14, slotDaysAhead: 2 };
  // 10am Dhaka = 04:00Z accepted, 8am Dhaka = 02:00Z rejected, 2pm start rejected (ends after 2pm)
  assert.equal(validSlot(new Date("2026-11-19T04:00:00Z"), now, cfg), true);
  assert.equal(validSlot(new Date("2026-11-19T02:00:00Z"), now, cfg), false);
  assert.equal(validSlot(new Date("2026-11-19T08:00:00Z"), now, cfg), false);
  assert.equal(validSlot(new Date("2026-11-22T04:00:00Z"), now, cfg), false);
  const slots = availableSlots(cfg, now);
  assert.equal(slots.length, 4); // 19th and 20th x (10am, 12pm); 21st is beyond 48 h
  assert.ok(slots.every((s) => validSlot(new Date(s.start), now, cfg)));
  // Defaults: 6 slots per day for 7 full days from 6am Dhaka
  assert.equal(availableSlots(undefined, now).length, 6 * 7);
});
test("category commission overrides the global percent", () => {
  const items = [
    { finalQty: 10, lockedRate: 20, categoryPercent: null }, // 200 at global 5%
    { finalQty: 2, lockedRate: 100, categoryPercent: 10 }, // 200 at 10%
  ];
  assert.equal(commissionDue(items, 5), 30);
  assert.equal(commissionDue(items, 0), 20);
});
