import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Db } from "./prisma";
import { AuthGuard } from "./auth";
import { CompleteDto, OnlineDto, PartnerDto, WeighDto } from "./dto";
import { ACTIVE, commissionDue, hash, same, totals } from "./rules";
import { cleanOrder, orderInclude, OrderService } from "./orders";
@ApiTags("Partner app")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("partner")
export class PartnerController {
  constructor(private db: Db, private orders: OrderService) {}
  async profile(userId: string) {
    const p = await this.db.partner.findUnique({ where: { userId } });
    if (!p) throw new BadRequestException("Complete partner onboarding first");
    return p;
  }
  @Post("onboard") async onboard(@Req() req: any, @Body() body: PartnerDto) {
    if (req.user.role === "ADMIN") throw new ForbiddenException();
    if (await this.db.partner.findUnique({ where: { userId: req.user.id } }))
      throw new BadRequestException("Partner application already exists");
    if (
      !(await this.db.area.findFirst({
        where: { id: body.areaId, active: true },
      }))
    )
      throw new BadRequestException("Unsupported area");
    return this.db.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: { ...body, userId: req.user.id },
      });
      await tx.user.update({
        where: { id: req.user.id },
        data: { role: "PARTNER" },
      });
      return { id: partner.id, kycStatus: partner.kycStatus };
    });
  }
  @Get("me") async me(@Req() req: any) {
    const p = await this.profile(req.user.id);
    const { nidRef, ...safe } = p;
    return safe;
  }
  @Post("online") async online(@Req() req: any, @Body() body: OnlineDto) {
    const p = await this.profile(req.user.id);
    if (p.kycStatus !== "approved")
      throw new ForbiddenException("Admin approval is required");
    return this.db.partner.update({
      where: { id: p.id },
      data: body,
      select: { id: true, online: true, lat: true, lng: true },
    });
  }
  @Get("offers") async offers(@Req() req: any) {
    const p = await this.profile(req.user.id);
    if (p.kycStatus !== "approved") return [];
    return this.db.dispatchOffer.findMany({
      where: {
        partnerId: p.id,
        expiresAt: { gt: new Date() },
        order: { status: "searching_partner" },
      },
      include: {
        order: {
          select: {
            id: true,
            type: true,
            slotStart: true,
            estimatedValue: true,
            createdAt: true,
            address: { select: { area: true } },
            items: { include: { item: true } },
          },
        },
      },
    });
  }
  @Get("orders") async list(@Req() req: any) {
    const p = await this.profile(req.user.id);
    return (
      await this.db.order.findMany({
        where: { partnerId: p.id },
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    ).map((o) => cleanOrder(o, req.user.id, req.user.role));
  }
  @Get("earnings") async earnings(@Req() req: any) {
    const p = await this.profile(req.user.id),
      orders = await this.db.order.findMany({
        where: { partnerId: p.id, status: "completed" },
        select: {
          id: true,
          finalValue: true,
          fee: true,
          creditUsed: true,
          updatedAt: true,
          items: {
            select: {
              finalQty: true,
              lockedRate: true,
              item: { select: { category: { select: { commissionPercent: true } } } },
            },
          },
        },
      }),
      config = await this.db.config.findUniqueOrThrow({
        where: { id: "main" },
      }),
      categories = await this.db.category.findMany({
        where: { active: true, commissionPercent: { not: null } },
        select: { id: true, name: true, nameBn: true, commissionPercent: true },
      });
    return {
      completed: orders.length,
      cashPaid: orders.reduce(
        (s, o) => s + (o.finalValue || 0) - o.fee + o.creditUsed,
        0
      ),
      commissionPercent: config.commissionPercent,
      categoryCommission: categories,
      commissionDue: Math.round(
        commissionDue(
          orders.flatMap((o) =>
            o.items.map((i) => ({
              finalQty: Number(i.finalQty || 0),
              lockedRate: i.lockedRate,
              categoryPercent: i.item.category.commissionPercent,
            }))
          ),
          config.commissionPercent
        )
      ),
      rating: p.rating,
      orders: orders.map(({ items, ...o }) => o),
    };
  }
  @Post("orders/:id/accept") async accept(
    @Req() req: any,
    @Param("id") id: string
  ) {
    const p = await this.profile(req.user.id);
    if (p.kycStatus !== "approved" || !p.online)
      throw new ForbiddenException("Go online with an approved account first");
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${p.id}))`;
      const busy = await tx.order.count({
        where: { partnerId: p.id, status: { in: ACTIVE as any } },
      });
      if (busy)
        throw new BadRequestException("Finish the current pickup first");
      const offer = await tx.dispatchOffer.findFirst({
        where: { orderId: id, partnerId: p.id, expiresAt: { gt: new Date() } },
      });
      if (!offer) throw new BadRequestException("This job offer has expired");
      const changed = await tx.order.updateMany({
        where: { id, status: "searching_partner", partnerId: null },
        data: { status: "partner_assigned", partnerId: p.id },
      });
      if (!changed.count)
        throw new BadRequestException(
          "Another partner already accepted this pickup"
        );
      await tx.dispatchOffer.update({
        where: { id: offer.id },
        data: { accepted: true },
      });
      const o = await tx.order.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });
      await this.orders.notify(
        tx,
        o.userId,
        "Partner assigned",
        "A verified partner has accepted your pickup.",
        id
      );
      return cleanOrder(o, req.user.id, req.user.role);
    });
  }
  async move(req: any, id: string, from: string, to: string) {
    const p = await this.profile(req.user.id);
    if (p.kycStatus !== "approved")
      throw new ForbiddenException("Partner account is not approved");
    return this.db.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id, partnerId: p.id, status: from as any },
        data: { status: to as any },
      });
      if (!changed.count)
        throw new BadRequestException("Invalid pickup status transition");
      const o = await tx.order.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });
      await this.orders.notify(
        tx,
        o.userId,
        to === "on_the_way" ? "Partner on the way" : "Partner arrived",
        to === "on_the_way"
          ? "Your recycling partner is heading to you."
          : "Your partner has arrived. Please prepare your materials.",
        id
      );
      return cleanOrder(o, req.user.id, req.user.role);
    });
  }
  @Post("orders/:id/depart") depart(@Req() req: any, @Param("id") id: string) {
    return this.move(req, id, "partner_assigned", "on_the_way");
  }
  @Post("orders/:id/arrive") arrive(@Req() req: any, @Param("id") id: string) {
    return this.move(req, id, "on_the_way", "arrived");
  }
  @Post("orders/:id/weigh") async weigh(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: WeighDto
  ) {
    const p = await this.profile(req.user.id);
    if (p.kycStatus !== "approved") throw new ForbiddenException();
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const o = await tx.order.findUnique({
        where: { id },
        include: { items: { include: { item: true } } },
      });
      if (
        !o ||
        o.partnerId !== p.id ||
        !["arrived", "weighing"].includes(o.status)
      )
        throw new BadRequestException("Arrive at the pickup before weighing");
      if (
        o.items.length !== body.items.length ||
        new Set(body.items.map((i) => i.id)).size !== body.items.length
      )
        throw new BadRequestException("Provide every material exactly once");
      for (const i of body.items) {
        const item = o.items.find((j) => j.id === i.id);
        if (!item || (item.item.unit === "pc" && !Number.isInteger(i.quantity)))
          throw new BadRequestException("Invalid material or piece quantity");
        await tx.orderItem.update({
          where: { id: i.id },
          data: { finalQty: i.quantity },
        });
      }
      const config = await tx.config.findUniqueOrThrow({
          where: { id: "main" },
        }),
        t = totals(
          body.items.map((i) => ({
            qty: i.quantity,
            rate: o.items.find((j) => j.id === i.id)!.lockedRate,
          })),
          config,
          o.creditUsed
        );
      await tx.order.update({
        where: { id },
        data: {
          status: "weighing",
          finalValue: t.value,
          fee: t.fee,
          weightsApproved: false,
          weighingVersion: { increment: 1 },
        },
      });
      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });
      await this.orders.notify(
        tx,
        o.userId,
        "Review final weights",
        "Please check the digital scale weights and approve before sharing your handover OTP.",
        id
      );
      return cleanOrder(updated, req.user.id, req.user.role);
    });
  }
  @Post("orders/:id/complete") async complete(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: CompleteDto
  ) {
    const p = await this.profile(req.user.id);
    if (p.kycStatus !== "approved") throw new ForbiddenException();
    const result = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const o = await tx.order.findUnique({ where: { id } });
      if (!o || o.partnerId !== p.id || o.status !== "weighing" || o.otpUsed)
        throw new BadRequestException("Pickup is not ready for completion");
      if (!o.weightsApproved || !body.cashPaid)
        throw new BadRequestException(
          "Seller must approve weights and receive cash first"
        );
      if (o.otpAttempts >= 5)
        throw new BadRequestException(
          "Too many OTP attempts. Contact support."
        );
      if (!same(o.otpHash, hash(body.otp))) {
        await tx.order.update({
          where: { id },
          data: { otpAttempts: { increment: 1 } },
        });
        return { error: "Incorrect handover OTP" };
      }
      const creditUsed = Math.min(o.creditUsed, o.fee);
      if (o.creditUsed > creditUsed)
        await tx.creditTxn.create({
          data: {
            userId: o.userId,
            amount: o.creditUsed - creditUsed,
            type: "adjustment",
            reason: "Unused fee credit returned after weighing",
            orderId: id,
          },
        });
      await tx.order.update({
        where: { id },
        data: {
          status: "completed",
          otpUsed: true,
          cashPaid: true,
          creditUsed,
        },
      });
      await this.orders.reward(tx, o);
      await this.orders.notify(
        tx,
        o.userId,
        "Pickup completed",
        "Your cash settlement invoice is ready.",
        id
      );
      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });
      return { order: cleanOrder(updated, req.user.id, req.user.role) };
    });
    if (result.error) throw new BadRequestException(result.error);
    return result.order;
  }
}
