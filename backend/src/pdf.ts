// Minimal dependency-free PDF writer. The downloadable invoice uses English labels
// and BDT amounts; the mobile invoice supports Bangla and the taka symbol.
export function invoicePdf(order: any): Buffer {
  const clean = (s: string) =>
    s.replace(/[^\x20-\x7e]/g, " ").replace(/[\\()]/g, "\\$&");
  const lines = [
    "GREEN DHAKA",
    "CASH SETTLEMENT INVOICE",
    "",
    "Order: GD-" + order.id,
    "Issued: " + new Date(order.updatedAt).toISOString(),
    "Partner: " + (order.partner?.user?.name || "Verified partner"),
    "Address: " + order.address.line1 + ", " + order.address.area.name,
    "",
    "MATERIAL                      FINAL QTY      RATE (BDT)     TOTAL (BDT)",
    ...order.items.map(
      (i: any) =>
        `${i.item.name.padEnd(28)} ${String(i.finalQty).padEnd(9)} ${
          i.item.unit
        }   ${String(i.lockedRate).padEnd(12)} ${Math.round(
          Number(i.finalQty) * i.lockedRate
        )}`
    ),
    "",
    "Scrap value: BDT " + order.finalValue,
    "Doorstep pickup fee: BDT " + order.fee,
    "Pickup credit applied: BDT " + order.creditUsed,
    "CASH RECEIVED: BDT " +
      Math.max(0, order.finalValue - order.fee + order.creditUsed),
    "",
    "Status: Completed and settled in cash.",
    "Booking rates were locked before doorstep digital weighing.",
    "Thank you for giving your recyclables a second life.",
  ];
  const content =
    "BT /F1 10 Tf 44 790 Td 16 TL " +
    lines
      .map((line, i) => (i ? "T* " : "") + "(" + clean(line) + ") Tj")
      .join("\n") +
    " ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${Buffer.byteLength(
      content
    )} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${
      objects.length + 1
    } /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
