import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient(),
  url = process.env.TEST_API_URL || "http://localhost:3000";
let count = 0;
async function request(
  path: string,
  token = "",
  method = "GET",
  body?: any,
  expected = 200
) {
  const response = await fetch(url + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${JSON.stringify(data)}`
  );
  count++;
  return data;
}
async function login(phone: string) {
  await db.otpChallenge.deleteMany({ where: { phone } });
  await request("/auth/otp", "", "POST", { phone }, 201);
  return request(
    "/auth/verify",
    "",
    "POST",
    { phone, code: process.env.DEV_OTP },
    201
  );
}
const check = (value: unknown, message: string) => {
  assert.ok(value, message);
  count++;
};
async function main() {
  if (process.env.NODE_ENV === "production" || !process.env.DEV_OTP)
    throw Error("E2E is for a seeded local development database only");
  const config = await request("/config");
  if (!config.ratesAreDemo)
    throw Error("Refusing to alter surveyed rates; use a demo database");
  await request("/health");
  await request("/orders", "", "GET", undefined, 401);
  await request("/auth/otp", "", "POST", { phone: "+911234567890" }, 400);
  const suffix = String(Date.now()).slice(-7),
    phone = "+88019" + suffix.padStart(8, "0");
  const seller = await login(phone),
    other = await login("+88018" + suffix.padStart(8, "0")),
    admin = await login("+8801700000000"),
    partner = await login("+8801800000000");
  await request("/admin/orders", seller.token, "GET", undefined, 403);
  await request("/auth/otp", "", "POST", { phone }, 201);
  await request("/auth/otp", "", "POST", { phone }, 429);
  await request(
    "/addresses",
    seller.token,
    "POST",
    {
      areaId: "dhanmondi",
      line1: "E2E Outside",
      landmark: "",
      label: "Test",
      lat: 24,
      lng: 91,
    },
    400
  );
  const address = await request(
    "/addresses",
    seller.token,
    "POST",
    {
      areaId: "dhanmondi",
      line1: "E2E Test House " + suffix,
      landmark: "Test only",
      label: "Test",
      lat: 23.7461,
      lng: 90.3742,
    },
    201
  );
  const oldRates = await request("/rates?area=dhanmondi"),
    paper = oldRates.find((r: any) => r.itemId === "newspaper");
  await request(
    "/orders",
    seller.token,
    "POST",
    {
      addressId: address.id,
      type: "instant",
      items: [{ itemId: "newspaper", quantity: 1 }],
    },
    400
  );
  await request(
    "/orders",
    seller.token,
    "POST",
    {
      addressId: address.id,
      type: "scheduled",
      slotStart: new Date(Date.now() - 1000).toISOString(),
      items: [{ itemId: "newspaper", quantity: 10 }],
    },
    400
  );
  await request(
    "/partner/online",
    partner.token,
    "POST",
    { online: true, lat: 23.7461, lng: 90.3742 },
    201
  );
  const order = await request(
    "/orders",
    seller.token,
    "POST",
    {
      addressId: address.id,
      type: "instant",
      items: [{ itemId: "newspaper", quantity: 10 }],
    },
    201
  );
  check(order.handoverOtp?.length === 4, "Seller receives handover OTP");
  check(
    !("otpHash" in order) && !("otpEncrypted" in order),
    "Secrets are not serialized"
  );
  await request("/orders/" + order.id, other.token, "GET", undefined, 403);
  await request("/orders/" + order.id, partner.token, "GET", undefined, 403);
  const adminView = await request("/admin/orders", admin.token);
  check(
    !adminView.find((o: any) => o.id === order.id).handoverOtp,
    "Admin cannot read handover code"
  );
  try {
    await request(
      "/admin/rates",
      admin.token,
      "POST",
      { itemId: "newspaper", areaId: "dhanmondi", price: paper.price + 1 },
      201
    );
    const locked = await request("/orders/" + order.id, seller.token);
    check(
      locked.items[0].lockedRate === paper.price,
      "Booking rate remains locked after admin change"
    );
    let offers: any[] = [];
    for (let i = 0; i < 15; i++) {
      offers = await request("/partner/offers", partner.token);
      if (offers.some((f) => f.orderId === order.id)) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    check(
      offers.some((f) => f.orderId === order.id),
      "Persistent dispatch offers the nearby job"
    );
    check(
      !JSON.stringify(offers).includes(order.handoverOtp),
      "Offer cannot expose handover OTP"
    );
    const accepted = await request(
      "/partner/orders/" + order.id + "/accept",
      partner.token,
      "POST",
      undefined,
      201
    );
    check(
      !accepted.handoverOtp && !accepted.otpHash && !accepted.otpEncrypted,
      "Partner never sees OTP"
    );
    await request(
      "/partner/orders/" + order.id + "/accept",
      partner.token,
      "POST",
      undefined,
      400
    );
    await request(
      "/partner/orders/" + order.id + "/arrive",
      partner.token,
      "POST",
      undefined,
      400
    );
    await request(
      "/partner/orders/" + order.id + "/depart",
      partner.token,
      "POST",
      undefined,
      201
    );
    await request(
      "/partner/orders/" + order.id + "/arrive",
      partner.token,
      "POST",
      undefined,
      201
    );
    await request(
      "/partner/orders/" + order.id + "/weigh",
      partner.token,
      "POST",
      { items: [{ id: order.items[0].id, quantity: 14 }] },
      201
    );
    await request(
      "/partner/orders/" + order.id + "/complete",
      partner.token,
      "POST",
      { otp: order.handoverOtp, cashPaid: true },
      400
    );
    const weighed = await request("/orders/" + order.id, seller.token);
    check(
      weighed.hasWeightDifference,
      "Weight difference above 25% is disclosed"
    );
    const staleVersion = weighed.weighingVersion;
    await request(
      "/partner/orders/" + order.id + "/weigh",
      partner.token,
      "POST",
      { items: [{ id: order.items[0].id, quantity: 14 }] },
      201
    );
    await request(
      "/orders/" + order.id + "/confirm",
      seller.token,
      "POST",
      { weighingVersion: staleVersion },
      400
    );
    weighed.weighingVersion = (
      await request("/orders/" + order.id, seller.token)
    ).weighingVersion;
    await request(
      "/orders/" + order.id + "/confirm",
      seller.token,
      "POST",
      { weighingVersion: weighed.weighingVersion },
      201
    );
    const wrong = order.handoverOtp === "0000" ? "1111" : "0000";
    await request(
      "/partner/orders/" + order.id + "/complete",
      partner.token,
      "POST",
      { otp: wrong, cashPaid: true },
      400
    );
    await request(
      "/partner/orders/" + order.id + "/complete",
      partner.token,
      "POST",
      { otp: order.handoverOtp, cashPaid: false },
      400
    );
    const completed = await request(
      "/partner/orders/" + order.id + "/complete",
      partner.token,
      "POST",
      { otp: order.handoverOtp, cashPaid: true },
      201
    );
    check(
      completed.status === "completed" && completed.cashPaid,
      "OTP and cash complete the pickup"
    );
    await request(
      "/partner/orders/" + order.id + "/complete",
      partner.token,
      "POST",
      { otp: order.handoverOtp, cashPaid: true },
      400
    );
    const invoice = await request(
      "/orders/" + order.id + "/invoice",
      seller.token
    );
    check(
      invoice.netPayout === Math.round(14 * paper.price) && invoice.fee === 0,
      "Invoice matches final locked-rate sum with no fee"
    );
    check(!invoice.handoverOtp, "Completed OTP is removed from seller view");
    await request(
      "/orders/" + order.id + "/rating",
      seller.token,
      "POST",
      { stars: 5, comment: "E2E verified" },
      201
    );
    await request(
      "/orders/" + order.id + "/cancel",
      seller.token,
      "POST",
      { reason: "E2E cannot cancel completed" },
      400
    );
    const reserved = await request(
      "/orders",
      seller.token,
      "POST",
      {
        addressId: address.id,
        type: "instant",
        items: [{ itemId: "newspaper", quantity: 10 }],
      },
      201
    );
    await request(
      "/orders/" + reserved.id + "/cancel",
      seller.token,
      "POST",
      { reason: "E2E cancellation" },
      201
    );
    const share = await request(
      "/orders/" + order.id + "/invoice/share",
      seller.token,
      "POST",
      undefined,
      201
    );
    const pdf = await fetch(url + share.url);
    check(
      pdf.status === 200 &&
        pdf.headers.get("content-type")?.includes("application/pdf"),
      "Signed invoice PDF downloads"
    );
    check(
      (await pdf.text()).startsWith("%PDF-1.4"),
      "PDF has valid document signature"
    );
    const signedToken = new URL(url + share.url).searchParams.get("token")!;
    await request("/orders", signedToken, "GET", undefined, 401);
    await request(
      "/receipts/" + order.id + ".pdf?token=invalid",
      "",
      "GET",
      undefined,
      401
    );
    await request(
      "/orders/" + order.id + "/invoice/share",
      other.token,
      "POST",
      undefined,
      403
    );
    const candidate = await request(
      "/partner/onboard",
      other.token,
      "POST",
      {
        nidRef: "E2E-verification-appointment",
        vehicle: "Bicycle",
        scaleDetails: "Digital 100kg",
        areaId: "dhanmondi",
        lat: 23.7461,
        lng: 90.3742,
      },
      201
    );
    await request(
      "/partner/online",
      other.token,
      "POST",
      { online: true, lat: 23.7461, lng: 90.3742 },
      403
    );
    await request(
      "/admin/partners/" + candidate.id + "/kyc",
      admin.token,
      "PUT",
      { status: "approved" },
      400
    );
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
      "base64"
    );
    for (const kind of ["nid", "portrait"]) {
      const form = new FormData();
      form.append(
        "file",
        new Blob([image], { type: "image/png" }),
        kind + ".png"
      );
      const uploaded = await fetch(url + "/partner/verification/" + kind, {
        method: "POST",
        headers: { Authorization: "Bearer " + other.token },
        body: form,
      });
      check(uploaded.status === 201, "Private " + kind + " upload succeeds");
      const document: any = await uploaded.json();
      const privateAccess = await fetch(url + document.url, {
        headers: { Authorization: "Bearer " + admin.token },
      });
      check(privateAccess.status === 200, "Admin can review " + kind);
      const denied = await fetch(url + document.url, {
        headers: { Authorization: "Bearer " + seller.token },
      });
      check(denied.status === 403, "Unrelated seller cannot read " + kind);
    }
    await request(
      "/admin/partners/" + candidate.id + "/kyc",
      admin.token,
      "PUT",
      { status: "approved" },
      200
    );
    const privacy = await request("/partner/me", other.token);
    check(
      !privacy.nidRef,
      "Partner status response excludes private identity reference"
    );
    // Credits are reserved only against the fee and fully released on cancellation.
    await request(
      "/admin/credits",
      admin.token,
      "POST",
      { userId: seller.user.id, amount: 50, reason: "E2E pickup credit" },
      201
    );
    const creditOrder = await request(
      "/orders",
      seller.token,
      "POST",
      {
        addressId: address.id,
        type: "instant",
        useCredit: true,
        items: [{ itemId: "newspaper", quantity: 6 }],
      },
      201
    );
    check(
      creditOrder.creditUsed === 40 &&
        creditOrder.netPayout === 6 * (paper.price + 1),
      "Credit offsets the fee without cash-out"
    );
    check(
      (await request("/credit", seller.token)).balance === 10,
      "Fee credit is reserved atomically"
    );
    await request(
      "/orders/" + creditOrder.id + "/cancel",
      seller.token,
      "POST",
      { reason: "E2E return reserved credit" },
      201
    );
    check(
      (await request("/credit", seller.token)).balance === 50,
      "Cancellation releases reserved credit exactly once"
    );
    // Five failed login attempts lock the challenge, including against a correct code.
    const lockPhone = "+88017" + suffix.padStart(8, "0");
    await request("/auth/otp", "", "POST", { phone: lockPhone }, 201);
    for (let i = 0; i < 5; i++)
      await request(
        "/auth/verify",
        "",
        "POST",
        {
          phone: lockPhone,
          code: process.env.DEV_OTP === "000000" ? "111111" : "000000",
        },
        401
      );
    await request(
      "/auth/verify",
      "",
      "POST",
      { phone: lockPhone, code: process.env.DEV_OTP },
      401
    );
    const docs = await fetch(url + "/docs-json");
    const schema: any = await docs.json();
    check(
      !!schema.paths["/partner/orders/{id}/complete"],
      "Swagger includes partner settlement"
    );
    check(
      !!schema.components.schemas.BookingDto,
      "Swagger includes booking request schema"
    );
  } finally {
    await request(
      "/admin/rates",
      admin.token,
      "POST",
      { itemId: "newspaper", areaId: "dhanmondi", price: paper.price },
      201
    );
    await request(
      "/partner/online",
      partner.token,
      "POST",
      { online: false, lat: 23.747, lng: 90.375 },
      201
    );
  }
  // ADM-3 slot configuration, per-category commission, analytics, device IDs
  const savedConfig = await db.config.findUniqueOrThrow({
      where: { id: "main" },
    }),
    { id: _configId, ...configBody } = savedConfig,
    paperCategory = await db.category.findUniqueOrThrow({
      where: { id: "paper" },
    });
  try {
    await request(
      "/admin/config",
      admin.token,
      "PUT",
      { ...configBody, slotStartHour: 9, slotEndHour: 20 },
      400
    );
    await request("/admin/config", seller.token, "PUT", configBody, 403);
    await request("/admin/config", seller.token, "GET", undefined, 403);
    const adminConfig = await request("/admin/config", admin.token);
    check(
      typeof adminConfig.commissionPercent === "number",
      "admin settings read includes the private commission percent"
    );
    // Round-trip exactly what the admin settings form submits
    await request("/admin/config", admin.token, "PUT", {
      ...configBody,
      commissionPercent: adminConfig.commissionPercent,
    });
    await request("/admin/config", admin.token, "PUT", {
      ...configBody,
      slotStartHour: 10,
      slotEndHour: 14,
      slotDaysAhead: 2,
    });
    const narrow: { start: string }[] = await request("/slots");
    check(
      narrow.length > 0 &&
        narrow.length <= 6 &&
        narrow.every((x) =>
          [10, 12].includes((new Date(x.start).getUTCHours() + 6) % 24)
        ),
      "configured slots limit hours to 10am-2pm Dhaka"
    );
    check(
      narrow.every(
        (x) => new Date(x.start).getTime() <= Date.now() + 2 * 86400000
      ),
      "configured slot horizon is respected"
    );
    await request("/admin/categories/paper", admin.token, "PUT", {
      id: "paper",
      name: paperCategory.name,
      nameBn: paperCategory.nameBn,
      icon: paperCategory.icon,
      color: paperCategory.color,
      active: paperCategory.active,
      commissionPercent: 12.5,
    });
    const earnings = await request("/partner/earnings", partner.token);
    check(
      earnings.categoryCommission.some(
        (c: any) => c.id === "paper" && c.commissionPercent === 12.5
      ) && Number.isInteger(earnings.commissionDue),
      "partner sees per-category commission override"
    );
    await request(
      "/admin/categories/paper",
      admin.token,
      "PUT",
      { ...paperCategory, commissionPercent: 101 },
      400
    );
  } finally {
    await db.config.update({ where: { id: "main" }, data: configBody });
    await db.category.update({
      where: { id: "paper" },
      data: { commissionPercent: paperCategory.commissionPercent },
    });
  }
  await request(
    "/events",
    seller.token,
    "POST",
    { name: "rates_viewed", area: "dhanmondi", appVersion: "1.0" },
    201
  );
  await request(
    "/events",
    seller.token,
    "POST",
    { name: "not_a_prd_event", appVersion: "1.0" },
    400
  );
  const devicePhone = "+88017" + suffix.padStart(8, "0");
  await db.otpChallenge.deleteMany({ where: { phone: devicePhone } });
  await request("/auth/otp", "", "POST", { phone: devicePhone }, 201);
  await request(
    "/auth/verify",
    "",
    "POST",
    { phone: devicePhone, code: process.env.DEV_OTP, deviceId: "e2e-" + suffix },
    201
  );
  const deviceUser = await db.user.findUniqueOrThrow({
    where: { phone: devicePhone },
  });
  check(
    deviceUser.deviceHash && deviceUser.deviceHash !== "e2e-" + suffix,
    "device ID stored only as a hash at sign-up"
  );
  await db.otpChallenge.deleteMany({ where: { phone } });
  await request("/auth/otp", "", "POST", { phone }, 201);
  await request(
    "/auth/verify",
    "",
    "POST",
    { phone, code: process.env.DEV_OTP, deviceId: "e2e-seller-" + suffix },
    201
  );
  check(
    (await db.user.findUniqueOrThrow({ where: { phone } })).deviceHash,
    "existing account without a device hash records one at next sign-in"
  );
  console.log(
    `PASS: ${count} end-to-end checks against PostgreSQL. Test pickups retained for inspection.`
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
