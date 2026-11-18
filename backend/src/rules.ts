import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export const ACTIVE = [
  "partner_assigned",
  "on_the_way",
  "arrived",
  "weighing",
  "disputed",
];
export function hash(value: string) {
  return createHmac("sha256", process.env.OTP_SECRET!)
    .update(value)
    .digest("hex");
}
export function same(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function key() {
  return createHash("sha256").update(process.env.OTP_SECRET!).digest();
}
export function encrypt(value: string) {
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(value, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64");
}
export function decrypt(value: string) {
  const b = Buffer.from(value, "base64"),
    c = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  c.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([c.update(b.subarray(28)), c.final()]).toString();
}
export function totals(
  items: { qty: number; rate: number }[],
  config: { pickupFee: number; freeThreshold: number },
  credit = 0
) {
  const value = Math.round(items.reduce((sum, i) => sum + i.qty * i.rate, 0));
  const fee = value >= config.freeThreshold ? 0 : config.pickupFee;
  const creditUsed = Math.min(Math.max(0, credit), fee);
  return { value, fee, creditUsed, net: Math.max(0, value - fee + creditUsed) };
}
export function weightDifference(estimated: number, final: number) {
  return estimated > 0 && Math.abs(final - estimated) / estimated > 0.25;
}
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const r = Math.PI / 180,
    a =
      Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
      Math.cos(lat1 * r) *
        Math.cos(lat2 * r) *
        Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export type SlotConfig = {
  slotStartHour: number;
  slotEndHour: number;
  slotDaysAhead: number;
};
export const DEFAULT_SLOTS: SlotConfig = {
  slotStartHour: 8,
  slotEndHour: 20,
  slotDaysAhead: 7,
};
/** Dhaka-local start hours of every 2-hour slot that ends by slotEndHour. */
export function slotHours(c: SlotConfig = DEFAULT_SLOTS) {
  const hours: number[] = [];
  for (let h = c.slotStartHour; h + 2 <= c.slotEndHour; h += 2) hours.push(h);
  return hours;
}
export function slotLabel(c: SlotConfig = DEFAULT_SLOTS) {
  const f = (h: number) =>
    `${h % 12 || 12}${h < 12 || h === 24 ? "am" : "pm"}`;
  return `Choose a 2-hour slot between ${f(c.slotStartHour)} and ${f(
    c.slotEndHour
  )} Dhaka time, within ${c.slotDaysAhead} days`;
}
export function validSlot(
  start: Date,
  now = new Date(),
  c: SlotConfig = DEFAULT_SLOTS
) {
  const dhaka = new Date(start.getTime() + 6 * 3600000);
  return (
    start > now &&
    start.getTime() <= now.getTime() + c.slotDaysAhead * 86400000 &&
    dhaka.getUTCMinutes() === 0 &&
    dhaka.getUTCSeconds() === 0 &&
    dhaka.getUTCMilliseconds() === 0 &&
    slotHours(c).includes(dhaka.getUTCHours())
  );
}
/** Slots offered to the seller, in Dhaka time (UTC+6, no DST). */
export function availableSlots(c: SlotConfig = DEFAULT_SLOTS, now = new Date()) {
  const today = new Date(now.getTime() + 6 * 3600000),
    slots: { start: string; end: string }[] = [];
  for (let d = 0; d <= c.slotDaysAhead; d++)
    for (const hour of slotHours(c)) {
      const start = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() + d,
          hour - 6
        )
      );
      if (validSlot(start, now, c))
        slots.push({
          start: start.toISOString(),
          end: new Date(start.getTime() + 7200000).toISOString(),
        });
    }
  return slots;
}
/** Commission on final value; a category percent overrides the global one. */
export function commissionDue(
  items: {
    finalQty: number;
    lockedRate: number;
    categoryPercent: number | null;
  }[],
  globalPercent: number
) {
  return items.reduce(
    (sum, i) =>
      sum +
      (i.finalQty * i.lockedRate * (i.categoryPercent ?? globalPercent)) / 100,
    0
  );
}
