"use strict";
let token = "",
  page = "overview",
  config = null,
  areas = [],
  catalogue = [],
  partners = [],
  currentOrders = [],
  sent = false,
  cooldown = 0;
const $ = (id) => document.getElementById(id);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
const money = (n) => "৳" + Math.round(Number(n) || 0).toLocaleString("en-BD");
const stamp = (d) =>
  new Date(d).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const status = (s) =>
  `<span class="status ${escape(s)}">${escape(s.replace(/_/g, " "))}</span>`;
async function api(path, method = "GET", body) {
  const r = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) {
    if (r.status === 401 && token) {
      token = "";
      $("workspace").hidden = true;
      $("login").hidden = false;
    }
    throw Error(
      Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message || "Request failed"
    );
  }
  return data;
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  setTimeout(() => ($("toast").hidden = true), 3500);
}
function fail(e) {
  $("error").textContent = e.message;
  $("error").hidden = false;
}
async function action(fn) {
  try {
    $("error").hidden = true;
    await fn();
    toast("Saved successfully");
  } catch (e) {
    fail(e);
  }
}
function table(headers, rows) {
  return `<div class="table-scroll"><table><thead><tr>${headers
    .map((h) => `<th>${h}</th>`)
    .join("")}</tr></thead><tbody>${
    rows.length
      ? rows.join("")
      : `<tr><td colspan="${headers.length}" class="empty">No records yet. A fresh start.</td></tr>`
  }</tbody></table></div>`;
}
function panel(title, desc, body) {
  return `<section class="panel"><div class="panel-heading"><div><h3>${title}</h3><p>${desc}</p></div></div>${body}</section>`;
}
function options(list, key = "id", label = "name") {
  return list
    .map(
      (x) => `<option value="${escape(x[key])}">${escape(x[label])}</option>`
    )
    .join("");
}
function orderRows(orders) {
  return orders.map(
    (o) =>
      `<tr><td><strong>GD-${escape(
        o.id.slice(0, 8).toUpperCase()
      )}</strong><small>${stamp(o.createdAt)}</small></td><td>${escape(
        o.user?.name || "Neighbour"
      )}<small>${escape(o.address.area.name)}</small></td><td>${escape(
        o.items.map((i) => i.item.name).join(", ")
      )}<small>${
        o.type === "scheduled" ? stamp(o.slotStart) : "Instant pickup"
      }</small></td><td>${status(o.status)}</td><td><strong>${money(
        o.netPayout
      )}</strong><small>${
        o.finalValue !== null ? "Final payout" : "Estimated payout"
      }</small></td><td><button class="secondary" data-order="${escape(
        o.id
      )}">View ↗</button></td></tr>`
  );
}
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-error").textContent = "";
  const btn = $("login-button");
  btn.disabled = true;
  try {
    if (!sent) {
      const data = await api("/auth/otp", "POST", { phone: $("phone").value });
      sent = true;
      $("phone").readOnly = true;
      $("code-block").hidden = false;
      $("code").required = true;
      btn.textContent = "Verify & enter workspace ↗";
      $("dev-hint").textContent = data.development
        ? "Local development: enter DEV_OTP from backend/.env (default 123456)."
        : "";
    } else {
      const data = await api("/auth/verify", "POST", {
        phone: $("phone").value,
        code: $("code").value,
      });
      if (data.user.role !== "ADMIN")
        throw Error("This workspace requires an administrator account.");
      token = data.token;
      $("login").hidden = true;
      $("workspace").hidden = false;
      await load();
    }
  } catch (err) {
    $("login-error").textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});
$("nav").addEventListener("click", (e) => {
  const b = e.target.closest("[data-page]");
  if (b) {
    page = b.dataset.page;
    void load();
  }
});
$("refresh").onclick = () => void load();
$("logout").onclick = () => {
  token = "";
  location.reload();
};
$("close-dialog").onclick = () => $("detail-dialog").close();
setInterval(
  () =>
    ($("clock").textContent =
      new Date().toLocaleString("en-GB", {
        timeZone: "Asia/Dhaka",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }) + " · Dhaka"),
  1000
);
async function load() {
  $("error").hidden = true;
  $("content").innerHTML =
    '<div class="loading">Getting a clearer picture…</div>';
  document
    .querySelectorAll("[data-page]")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  $("page-title").textContent = {
    overview: "A little greener, today.",
    orders: "Pickup orders",
    partners: "Recycling partners",
    rates: "Material rates",
    catalogue: "Material catalogue",
    credits: "Pickup credits",
    waitlist: "Our next neighbourhoods",
    settings: "Business settings",
    audit: "Activity log",
  }[page];
  try {
    [config, areas, catalogue] = await Promise.all([
      api("/admin/config"),
      api("/areas"),
      api("/admin/catalogue"),
    ]);
    $("banner").hidden = !config.ratesAreDemo;
    $("banner").textContent =
      "DEMO RATES · Seed prices are for testing. Enter surveyed Dhaka rates, then switch off demo pricing in Business settings.";
    if (page === "overview") await overview();
    if (page === "orders") await orders();
    if (page === "partners") await partnerPage();
    if (page === "rates") await rates();
    if (page === "catalogue") cataloguePage();
    if (page === "credits") credits();
    if (page === "waitlist") await waitlist();
    if (page === "settings") settings();
    if (page === "audit") await audit();
  } catch (e) {
    $("content").innerHTML = "";
    fail(e);
  }
}
async function overview() {
  const [d, orders] = await Promise.all([
    api("/admin/dashboard"),
    api("/admin/orders"),
  ]);
  currentOrders = orders;
  $(
    "content"
  ).innerHTML = `<div class="welcome"><div><span class="eyebrow" style="color:#c5dba9">THE EVERYDAY WORK OF A GREENER CITY</span><h2 style="margin-top:12px">Good things are growing<br>in your neighbourhood.</h2><p>Keep an eye on pickups, people, and the progress that matters.</p></div><div class="badge">♧</div></div><div class="stats">${[
    [d.total, "Total pickups", "Across all neighbourhoods"],
    [d.active, "In progress", "A little less waste, on the way"],
    [
      d.completionRate + "%",
      "Completion rate",
      d.completed + " pickups completed",
    ],
    [d.online, "Partners online", d.partners + " registered partners"],
  ]
    .map(
      ([v, l, s]) =>
        `<div class="stat"><label>${l}</label><strong>${v}</strong><small>${s}</small></div>`
    )
    .join("")}</div>${panel(
    "The latest pickups",
    "Your most recent recycling requests, all in one place.",
    table(
      ["ORDER", "NEIGHBOUR", "MATERIALS", "STATUS", "PAYOUT", ""],
      orderRows(orders.slice(0, 8))
    )
  )}<div class="note">Launch areas: ${areas
    .map((a) => escape(a.name))
    .join(
      " · "
    )}. Cash settlements only. Need the full API? Open <a href="/docs">Swagger documentation ↗</a>.</div>`;
}
async function orders() {
  currentOrders = await api("/admin/orders");
  partners = await api("/admin/partners");
  $("content").innerHTML = panel(
    "Every pickup, in view.",
    "Inspect, assign, cancel or resolve a pickup. Final cash settlement always requires seller approval and OTP.",
    `<div class="toolbar"><label>Search orders or neighbourhood<input id="order-search" placeholder="Search…"></label><label>Status<select id="order-filter"><option value="">All statuses</option>${[
      "searching_partner",
      "no_partner_found",
      "partner_assigned",
      "on_the_way",
      "arrived",
      "weighing",
      "disputed",
      "completed",
      "cancelled",
    ]
      .map((s) => `<option>${s}</option>`)
      .join("")}</select></label></div><div id="order-table"></div>`
  );
  const render = () => {
    const q = $("order-search").value.toLowerCase(),
      filter = $("order-filter").value;
    $("order-table").innerHTML = table(
      ["ORDER", "NEIGHBOUR", "MATERIALS", "STATUS", "PAYOUT", ""],
      orderRows(
        currentOrders.filter(
          (o) =>
            (!filter || o.status === filter) &&
            (o.id + o.user?.name + o.address.area.name)
              .toLowerCase()
              .includes(q)
        )
      )
    );
  };
  $("order-search").oninput = render;
  $("order-filter").onchange = render;
  render();
}
async function showOrder(id) {
  const o = currentOrders.find((x) => x.id === id);
  if (!o) return;
  if (!partners.length) partners = await api("/admin/partners");
  $(
    "dialog-content"
  ).innerHTML = `<span class="eyebrow">PICKUP DETAILS</span><h2>GD-${escape(
    id.slice(0, 8).toUpperCase()
  )}</h2><div class="grid"><p><small>STATUS</small>${status(
    o.status
  )}</p><p><small>NEIGHBOUR</small>${escape(o.user?.name)} · ${escape(
    o.user?.phone
  )}</p><p><small>PICKUP ADDRESS</small>${escape(o.address.line1)}<br>${escape(
    o.address.area.name
  )} · ${escape(o.address.landmark)}</p><p><small>PARTNER</small>${escape(
    o.partner?.name || "Not assigned"
  )}</p><p><small>PAYOUT</small>${money(o.netPayout)} (fee ${money(
    o.fee
  )}; credit ${money(
    o.creditUsed
  )})</p><p><small>USER ID · FOR CREDIT REFUNDS</small>${escape(
    o.userId
  )}</p></div>${table(
    ["MATERIAL", "ESTIMATE", "FINAL", "LOCKED RATE"],
    o.items.map(
      (i) =>
        `<tr><td>${escape(i.item.name)}</td><td>${i.estimatedQty} ${
          i.item.unit
        }</td><td>${i.finalQty ?? "—"} ${i.item.unit}</td><td>${money(
          i.lockedRate
        )}/${i.item.unit}</td></tr>`
    )
  )}${
    ["searching_partner", "no_partner_found", "partner_assigned"].includes(
      o.status
    )
      ? `<form id="assign-form" class="toolbar"><label>Assign an approved partner<select id="assign-partner">${options(
          partners
            .filter((p) => p.kycStatus === "approved")
            .map((p) => ({ id: p.id, name: p.user.name + " · " + p.areaId }))
        )}</select></label><button class="primary">Assign partner ↗</button></form>`
      : ""
  }${
    !["completed", "cancelled"].includes(o.status)
      ? `<label>Reason for admin action<textarea id="order-reason" placeholder="Explain the decision for the audit record…"></textarea></label><div class="actions">${
          o.status === "disputed"
            ? '<button class="secondary" id="reopen">Reopen weighing</button><button class="danger" id="resolve-cancel">Resolve & cancel</button>'
            : '<button class="danger" id="cancel-order">Cancel pickup</button>'
        }</div>`
      : ""
  }`;
  $("detail-dialog").showModal();
  if ($("assign-form"))
    $("assign-form").onsubmit = (e) => {
      e.preventDefault();
      void action(async () => {
        await api("/admin/orders/" + id + "/assign", "POST", {
          partnerId: $("assign-partner").value,
        });
        $("detail-dialog").close();
        await load();
      });
    };
  const reason = () => {
    const r = $("order-reason").value;
    if (r.trim().length < 3) throw Error("Please explain the reason.");
    return r;
  };
  if ($("cancel-order"))
    $("cancel-order").onclick = () =>
      void action(async () => {
        await api("/orders/" + id + "/cancel", "POST", { reason: reason() });
        $("detail-dialog").close();
        await load();
      });
  if ($("reopen"))
    $("reopen").onclick = () =>
      void action(async () => {
        await api("/admin/orders/" + id + "/reopen", "POST");
        $("detail-dialog").close();
        await load();
      });
  if ($("resolve-cancel"))
    $("resolve-cancel").onclick = () =>
      void action(async () => {
        await api("/admin/orders/" + id + "/resolve", "POST", {
          status: "cancelled",
          reason: reason(),
        });
        $("detail-dialog").close();
        await load();
      });
}
async function partnerPage() {
  partners = await api("/admin/partners");
  $("content").innerHTML = panel(
    "The people behind the pickups.",
    "Verify identity privately before approving. A suspension immediately stops new offers and partner actions.",
    table(
      ["PARTNER", "SERVICE AREA", "VERIFICATION", "SUPPLY", "DETAILS", ""],
      partners.map(
        (p) =>
          `<tr><td><strong>${escape(
            p.user.name || "Partner"
          )}</strong><small>${escape(p.user.phone)}</small></td><td>${escape(
            p.areaId
          )}<small>${escape(p.vehicle)}</small></td><td>${status(
            p.kycStatus
          )}</td><td>${
            p.online ? "● Online" : "○ Offline"
          }<small>★ ${p.rating.toFixed(1)}</small></td><td>${escape(
            p.scaleDetails
          )}<small>KYC: ${escape(
            p.nidRef
          )}</small></td><td><button class="secondary" data-doc="${escape(
            p.nidRef
          )}" ${
            p.nidRef.startsWith("/partner/") ? "" : "hidden"
          }>View NID</button> <button class="secondary" data-doc="${escape(
            p.photoUrl
          )}" ${
            p.photoUrl ? "" : "hidden"
          }>Portrait</button> <button class="secondary" data-kyc="${escape(
            p.id
          )}" data-value="approved">Approve</button> <button class="danger" data-kyc="${escape(
            p.id
          )}" data-value="suspended">Suspend</button></td></tr>`
      )
    )
  );
}
async function rates() {
  const history = await api("/admin/rates/history");
  const items = catalogue.flatMap((c) => c.items);
  $("content").innerHTML =
    panel(
      "A fair price starts here.",
      "New prices apply to new bookings. Existing pickups keep their locked rates.",
      `<form id="rate-form" class="toolbar"><label>Launch area<select id="rate-area">${options(
        areas
      )}</select></label><label>Material<select id="rate-item">${options(
        items
      )}</select></label><label>BDT per kg / piece<input id="rate-price" type="number" min="1" max="1000000" step="1" required placeholder="e.g. 25"></label><button class="primary">Publish rate ↗</button></form>`
    ) +
    panel(
      "Rate history",
      "Every change is dated and audited.",
      table(
        ["MATERIAL", "AREA", "RATE", "EFFECTIVE FROM", "CHANGED BY"],
        history.map(
          (r) =>
            `<tr><td><strong>${escape(r.item.name)}</strong><small>${escape(
              r.item.nameBn
            )}</small></td><td>${escape(r.area.name)}</td><td><strong>${money(
              r.price
            )}/${r.item.unit}</strong></td><td>${stamp(
              r.effectiveFrom
            )}</td><td>${escape(r.updatedBy.slice(0, 16))}</td></tr>`
        )
      )
    );
  $("rate-form").onsubmit = (e) => {
    e.preventDefault();
    void action(async () => {
      await api("/admin/rates", "POST", {
        areaId: $("rate-area").value,
        itemId: $("rate-item").value,
        price: Number($("rate-price").value),
      });
      await load();
    });
  };
}
function cataloguePage() {
  $(
    "content"
  ).innerHTML = `<div class="note">Deactivate a category or material to remove it from new bookings while preserving existing invoices.</div><div class="forms">${panel(
    "Categories",
    "Create or update by a stable ID.",
    `<form id="category-form" class="form-card"><label>Category ID<input name="id" required pattern="[a-z0-9-]{2,50}" placeholder="paper"></label><label>English name<input name="name" required></label><label>Bangla name<input name="nameBn" required></label><label>Icon key<select name="icon">${[
      "paper",
      "plastic",
      "metal",
      "electronics",
      "glass",
      "rubber",
    ]
      .map((x) => `<option>${x}</option>`)
      .join(
        ""
      )}</select></label><label>Card background colour<input name="color" type="color" value="#E3F1E6"></label><label>Partner commission for this category (%)<input name="commissionPercent" type="number" min="0" max="100" step="0.1" placeholder="Blank uses the global rate"></label><label>Visibility<select name="active"><option value="true">Active</option><option value="false">Inactive</option></select></label><button class="primary">Save category</button></form>`
  )}${panel(
    "Materials",
    "Add a subtype and then publish a rate for each area.",
    `<form id="item-form" class="form-card"><label>Item ID<input name="id" required pattern="[a-z0-9-]{2,50}" placeholder="newspaper"></label><label>Category<select name="categoryId">${options(
      catalogue
    )}</select></label><label>English name<input name="name" required></label><label>Bangla name<input name="nameBn" required></label><label>Unit<select name="unit"><option value="kg">Kilograms</option><option value="pc">Pieces</option></select></label><label>Visibility<select name="active"><option value="true">Active</option><option value="false">Inactive</option></select></label><button class="primary">Save material</button></form>`
  )}</div>${panel(
    "Current catalogue",
    "Click a category or material to load it into its form.",
    table(
      ["CATEGORY", "MATERIALS", "COMMISSION", "STATE"],
      catalogue.map(
        (c) =>
          `<tr><td><button class="secondary" data-edit-category="${escape(
            c.id
          )}">${escape(c.name)} ↗</button><small>${escape(c.nameBn)} · ${escape(
            c.id
          )}</small></td><td>${c.items
            .map(
              (i) =>
                `<button class="secondary" data-edit-item="${escape(
                  i.id
                )}">${escape(i.name)} / ${i.unit}${
                  i.active ? "" : " (inactive)"
                }</button>`
            )
            .join(" ")}</td><td>${
            c.commissionPercent == null
              ? `Global ${config.commissionPercent}%`
              : `<strong>${c.commissionPercent}%</strong>`
          }</td><td>${status(
            c.active ? "active" : "inactive"
          )}</td></tr>`
      )
    )
  )}`;
  for (const [formId, route] of [
    ["category-form", "categories"],
    ["item-form", "items"],
  ])
    $(formId).onsubmit = (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      body.active = body.active === "true";
      if ("commissionPercent" in body)
        body.commissionPercent =
          body.commissionPercent === "" ? null : Number(body.commissionPercent);
      void action(async () => {
        await api("/admin/" + route + "/" + body.id, "PUT", body);
        await load();
      });
    };
}
function credits() {
  $(
    "content"
  ).innerHTML = `<div class="note">Pickup credit offsets fees only. These adjustments are recorded in the ledger and audit log; they do not represent a cash refund.</div>${panel(
    "Make it right.",
    "Use the seller user ID from a pickup detail.",
    `<form id="credit-form" class="form-card" style="max-width:600px"><label>Seller user ID<input name="userId" required></label><label>Credit amount (BDT)<input name="amount" type="number" min="1" max="10000" step="1" required></label><label>Reason<textarea name="reason" minlength="3" maxlength="200" required></textarea></label><button class="primary">Issue pickup credit ↗</button></form>`
  )}`;
  $("credit-form").onsubmit = (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    body.amount = Number(body.amount);
    void action(async () => {
      await api("/admin/credits", "POST", body);
      e.target.reset();
    });
  };
}
async function waitlist() {
  const data = await api("/admin/waitlist");
  $("content").innerHTML = panel(
    "Where we grow next.",
    "Neighbourhood requests from people outside launch areas.",
    table(
      ["NEIGHBOURHOOD", "PHONE", "JOINED"],
      data.map(
        (x) =>
          `<tr><td><strong>${escape(x.area)}</strong></td><td>${escape(
            x.phone
          )}</td><td>${stamp(x.createdAt)}</td></tr>`
      )
    )
  );
}
function settings() {
  $("content").innerHTML = panel(
    "The rules of a fair pickup.",
    "Changes apply to future calculations. Pickup slots are 2 hours long, so first-start and last-end hours must both be even or both odd. Category commissions override the global rate in Catalogue. Keep support contacts current and publish real rates before launch.",
    `<form id="config-form" class="form-card form-grid">${[
      ["pickupFee", "Pickup fee (BDT)", 0, 10000, 1],
      ["freeThreshold", "Free pickup threshold (BDT)", 1, 100000, 1],
      ["minimumOrder", "Minimum estimated value (BDT)", 1, 100000, 1],
      ["referralAmount", "Referral credit (BDT)", 0, 1000, 1],
      ["radiusKm", "Initial dispatch radius (km)", 0.5, 20, 0.1],
      ["expandedRadiusKm", "Expanded radius (km)", 1, 40, 0.1],
      ["commissionPercent", "Global partner commission (%)", 0, 100, 0.1],
      ["slotStartHour", "First pickup slot starts (Dhaka hour)", 6, 22, 1],
      ["slotEndHour", "Last pickup slot ends (Dhaka hour)", 8, 24, 1],
      ["slotDaysAhead", "Scheduling horizon (days)", 1, 30, 1],
    ]
      .map(
        ([key, label, min, max, step]) =>
          `<label>${label}<input name="${key}" value="${config[key]}" type="number" min="${min}" max="${max}" step="${step}" required></label>`
      )
      .join("")}<label>Support phone<input name="supportPhone" value="${escape(
      config.supportPhone
    )}" placeholder="+880…"></label><label>WhatsApp number<input name="supportWhatsapp" value="${escape(
      config.supportWhatsapp
    )}" placeholder="+880…"></label><label>Pricing mode<select name="ratesAreDemo"><option value="true" ${
      config.ratesAreDemo ? "selected" : ""
    }>Demo prices · testing only</option><option value="false" ${
      !config.ratesAreDemo ? "selected" : ""
    }>Surveyed launch prices</option></select></label><button class="primary wide">Save business settings ↗</button></form>`
  );
  $("config-form").onsubmit = (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    for (const k of Object.keys(body))
      if (!["supportPhone", "supportWhatsapp", "ratesAreDemo"].includes(k))
        body[k] = Number(body[k]);
    body.ratesAreDemo = body.ratesAreDemo === "true";
    void action(async () => {
      await api("/admin/config", "PUT", body);
      await load();
    });
  };
}
async function audit() {
  const data = await api("/admin/audit");
  $("content").innerHTML = panel(
    "A record you can trust.",
    "Administrative changes, with before and after values.",
    table(
      ["TIME", "ACTION", "ACTOR", "ENTITY", "CHANGE"],
      data.map(
        (x) =>
          `<tr><td>${stamp(x.createdAt)}</td><td><strong>${escape(
            x.action
          )}</strong></td><td>${escape(x.actor.slice(0, 12))}</td><td>${escape(
            x.entity.slice(0, 20)
          )}</td><td><details><summary>View change</summary><pre>${escape(
            JSON.stringify({ before: x.before, after: x.after }, null, 2)
          )}</pre></details></td></tr>`
      )
    )
  );
}
$("content").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.order) void showOrder(b.dataset.order).catch(fail);
  if (b.dataset.kyc)
    void action(async () => {
      await api("/admin/partners/" + b.dataset.kyc + "/kyc", "PUT", {
        status: b.dataset.value,
      });
      await load();
    });
  if (b.dataset.editCategory) {
    const c = catalogue.find((x) => x.id === b.dataset.editCategory);
    for (const [key, value] of Object.entries(c))
      if ($("category-form").elements[key])
        $("category-form").elements[key].value =
          value == null ? "" : String(value);
    $("category-form").scrollIntoView({ behavior: "smooth" });
  }
  if (b.dataset.editItem) {
    const item = catalogue
      .flatMap((c) => c.items)
      .find((i) => i.id === b.dataset.editItem);
    for (const [key, value] of Object.entries(item))
      if ($("item-form").elements[key])
        $("item-form").elements[key].value = String(value);
    $("item-form").scrollIntoView({ behavior: "smooth" });
  }
});

$("content").addEventListener("click", (e) => {
  const b = e.target.closest("[data-doc]");
  if (!b) return;
  void action(async () => {
    const response = await fetch(b.dataset.doc, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!response.ok) throw Error("Unable to open private document");
    const url = URL.createObjectURL(await response.blob());
    $("dialog-content").innerHTML =
      '<h2>Private verification document</h2><img style="width:100%;border-radius:12px" src="' +
      url +
      '">';
    $("detail-dialog").showModal();
    $("detail-dialog").addEventListener(
      "close",
      () => URL.revokeObjectURL(url),
      { once: true }
    );
  });
});
