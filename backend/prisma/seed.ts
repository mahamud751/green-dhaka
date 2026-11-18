import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  await db.config.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      supportPhone: process.env.SUPPORT_PHONE || "",
      supportWhatsapp: process.env.SUPPORT_WHATSAPP || "",
    },
    update: {},
  });
  const areas = [
    {
      id: "gulshan",
      name: "Gulshan / Banani",
      nameBn: "গুলশান / বনানী",
      lat: 23.7925,
      lng: 90.4078,
      radiusKm: 3,
    },
    {
      id: "dhanmondi",
      name: "Dhanmondi",
      nameBn: "ধানমন্ডি",
      lat: 23.7461,
      lng: 90.3742,
      radiusKm: 3,
    },
    {
      id: "mirpur",
      name: "Mirpur",
      nameBn: "মিরপুর",
      lat: 23.8041,
      lng: 90.3667,
      radiusKm: 3,
    },
  ];
  for (const a of areas)
    await db.area.upsert({ where: { id: a.id }, create: a, update: {} });
  const categories = [
    ["paper", "Paper", "কাগজ", "paper", "#F6EBD6"],
    ["plastic", "Plastic", "প্লাস্টিক", "plastic", "#E2F0FF"],
    ["metal", "Metal", "ধাতু", "metal", "#EEE9E4"],
    ["electronics", "E-waste", "ই-বর্জ্য", "electronics", "#EEE8FF"],
    ["glass", "Glass", "কাচ", "glass", "#E3F1E6"],
    ["rubber", "Rubber", "রাবার", "rubber", "#FCE9DF"],
  ];
  for (const [id, name, nameBn, icon, color] of categories)
    await db.category.upsert({
      where: { id },
      create: { id, name, nameBn, icon, color },
      update: {},
    });
  const items: [string, string, string, string, string, number][] = [
    ["newspaper", "paper", "Newspaper", "সংবাদপত্র", "kg", 20],
    ["cardboard", "paper", "Cardboard", "কার্ডবোর্ড", "kg", 14],
    ["white-paper", "paper", "White paper", "সাদা কাগজ", "kg", 25],
    ["pet-bottles", "plastic", "PET bottles", "পিইটি বোতল", "kg", 28],
    ["mixed-plastic", "plastic", "Mixed plastic", "মিশ্র প্লাস্টিক", "kg", 18],
    ["iron", "metal", "Iron", "লোহা", "kg", 45],
    ["tin", "metal", "Tin", "টিন", "kg", 35],
    ["copper", "metal", "Copper", "তামা", "kg", 650],
    ["aluminium", "metal", "Aluminium", "অ্যালুমিনিয়াম", "kg", 140],
    ["laptop", "electronics", "Laptop", "ল্যাপটপ", "pc", 350],
    ["cpu", "electronics", "Computer CPU", "কম্পিউটার সিপিইউ", "pc", 250],
    ["monitor", "electronics", "Monitor", "মনিটর", "pc", 180],
    ["glass-bottles", "glass", "Glass bottles", "কাচের বোতল", "kg", 6],
    ["mixed-rubber", "rubber", "Mixed rubber", "মিশ্র রাবার", "kg", 12],
  ];
  for (const [id, categoryId, name, nameBn, unit, price] of items) {
    await db.item.upsert({
      where: { id },
      create: { id, categoryId, name, nameBn, unit },
      update: {},
    });
    for (const a of areas)
      if (!(await db.rate.findFirst({ where: { itemId: id, areaId: a.id } })))
        await db.rate.create({
          data: { itemId: id, areaId: a.id, price, updatedBy: "demo-seed" },
        });
  }
  if (process.env.NODE_ENV !== "production") {
    const seller = await db.user.upsert({
      where: { phone: "+8801712345678" },
      create: {
        phone: "+8801712345678",
        name: "Nafisa Rahman",
        referralCode: "GDNAFISA",
      },
      update: {},
    });
    await db.user.upsert({
      where: { phone: "+8801700000000" },
      create: {
        phone: "+8801700000000",
        name: "Green Dhaka Admin",
        role: "ADMIN",
        referralCode: "GDADMIN",
      },
      update: {},
    });
    const p = await db.user.upsert({
      where: { phone: "+8801800000000" },
      create: {
        phone: "+8801800000000",
        name: "Rakib Hasan",
        role: "PARTNER",
        referralCode: "GDRAKIB",
      },
      update: {},
    });
    await db.partner.upsert({
      where: { userId: p.id },
      create: {
        userId: p.id,
        nidRef: "DEMO-NOT-A-REAL-NID",
        vehicle: "Cargo bicycle",
        scaleDetails: "Digital scale · 100 kg capacity",
        kycStatus: "approved",
        online: false,
        areaId: "dhanmondi",
        lat: 23.747,
        lng: 90.375,
        rating: 4.9,
      },
      update: {},
    });
    if (
      !(await db.address.findFirst({
        where: { userId: seller.id, active: true },
      }))
    )
      await db.address.create({
        data: {
          userId: seller.id,
          areaId: "dhanmondi",
          label: "Home",
          line1: "House 12, Road 7, 3rd floor",
          landmark: "Near Dhanmondi Lake",
          lat: 23.7461,
          lng: 90.3742,
        },
      });
  }
  console.log(
    "Seeded launch areas and DEMO rates. Development accounts are listed in README.md."
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
