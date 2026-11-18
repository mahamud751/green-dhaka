import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Db } from "./prisma";
import { ACTIVE, distanceKm } from "./rules";
@Injectable()
export class DispatchService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private log = new Logger("Dispatch");
  constructor(private db: Db) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 3000);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.dispatch();
      await this.deliver();
    } catch (e) {
      this.log.error(String(e));
    } finally {
      this.busy = false;
    }
  }
  async dispatch() {
    const pending = await this.db.order.findMany({
      where: {
        status: "searching_partner",
        OR: [
          { type: "instant" },
          {
            type: "scheduled",
            slotStart: { lte: new Date(Date.now() + 90 * 60000) },
          },
        ],
      },
      select: { id: true },
      take: 100,
    });
    for (const { id } of pending)
      await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
        const o = await tx.order.findUniqueOrThrow({
          where: { id },
          include: { address: true, offers: true },
        });
        if (o.status !== "searching_partner") return;
        if (o.offers.some((f) => f.expiresAt > new Date())) return;
        const age =
          (Date.now() -
            (o.type === "scheduled"
              ? Math.max(
                  o.createdAt.getTime(),
                  o.slotStart!.getTime() - 90 * 60000
                )
              : o.createdAt.getTime())) /
          1000;
        if (age >= 300) {
          await tx.order.update({
            where: { id },
            data: { status: "no_partner_found" },
          });
          await tx.notification.create({
            data: {
              userId: o.userId,
              orderId: id,
              title: "No partner available",
              body: "Please schedule a new pickup. Reserved credit has been returned.",
            },
          });
          if (o.creditUsed) {
            await tx.creditTxn.create({
              data: {
                userId: o.userId,
                amount: o.creditUsed,
                type: "release",
                reason: "No partner available",
                orderId: id,
              },
            });
            await tx.order.update({ where: { id }, data: { creditUsed: 0 } });
          }
          return;
        }
        const config = await tx.config.findUniqueOrThrow({
            where: { id: "main" },
          }),
          radius = age >= 180 ? config.expandedRadiusKm : config.radiusKm;
        const candidates = await tx.partner.findMany({
          where: {
            online: true,
            kycStatus: "approved",
            areaId: o.address.areaId,
            id: { notIn: o.offers.map((f) => f.partnerId) },
            orders: { none: { status: { in: ACTIVE as any } } },
            offers: {
              none: {
                expiresAt: { gt: new Date() },
                accepted: false,
                order: { status: "searching_partner" },
              },
            },
          },
        });
        const closest = candidates
          .map((p) => ({
            ...p,
            distance: distanceKm(o.address.lat, o.address.lng, p.lat, p.lng),
          }))
          .filter((p) => p.distance <= radius)
          .sort((a, b) => a.distance - b.distance)[0];
        if (!closest) return;
        await tx.dispatchOffer.create({
          data: {
            orderId: id,
            partnerId: closest.id,
            expiresAt: new Date(Date.now() + 20000),
          },
        });
        await tx.notification.create({
          data: {
            userId: closest.userId,
            orderId: id,
            title: "New pickup nearby",
            body: `A pickup in ${o.address.areaId} is available. Accept within 20 seconds.`,
          },
        });
      });
  }
  async deliver() {
    if (!process.env.NOTIFICATION_WEBHOOK_URL) return;
    const queue = await this.db.notification.findMany({
      where: { delivered: false, attempts: { lt: 5 } },
      take: 10,
      orderBy: { createdAt: "asc" },
    });
    for (const n of queue) {
      await this.db.notification.update({
        where: { id: n.id },
        data: { attempts: { increment: 1 } },
      });
      try {
        const r = await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": n.id,
          },
          body: JSON.stringify(n),
          signal: AbortSignal.timeout(5000),
        });
        if (r.ok)
          await this.db.notification.update({
            where: { id: n.id },
            data: { delivered: true },
          });
      } catch {
        this.log.warn(`Notification delivery pending: ${n.id}`);
      }
    }
  }
}
