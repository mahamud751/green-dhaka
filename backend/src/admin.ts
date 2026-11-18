import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Db } from "./prisma";
import { AuthGuard, Roles } from "./auth";
import {
  AssignDto,
  CategoryDto,
  ConfigDto,
  CreditDto,
  ItemDto,
  KycDto,
  RateDto,
  ResolveDto,
} from "./dto";
import { ACTIVE } from "./rules";
import { cleanOrder, orderInclude, OrderService } from "./orders";
@ApiTags("Admin operations")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private db: Db, private orders: OrderService) {}
  async audit(
    tx: any,
    actor: string,
    action: string,
    entity: string,
    before: any,
    after: any
  ) {
    await tx.auditLog.create({
      data: {
        actor,
        action,
        entity,
        before: before ? JSON.parse(JSON.stringify(before)) : undefined,
        after: JSON.parse(JSON.stringify(after)),
      },
    });
  }
  @Get("dashboard") async dashboard() {
    const [total, completed, active, partners, online, waitlist] =
      await Promise.all([
        this.db.order.count(),
        this.db.order.count({ where: { status: "completed" } }),
        this.db.order.count({
          where: { status: { in: ["searching_partner", ...ACTIVE] as any } },
        }),
        this.db.partner.count(),
        this.db.partner.count({
          where: { online: true, kycStatus: "approved" },
        }),
        this.db.waitlist.count(),
      ]);
    return {
      total,
      completed,
      active,
      partners,
      online,
      waitlist,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    };
  }
  @Get("orders") async list() {
    return (
      await this.db.order.findMany({
        include: {
          ...orderInclude,
          user: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
    ).map((o) => cleanOrder(o, "", "ADMIN"));
  }
  @Get("partners") partners() {
    return this.db.partner.findMany({
      include: { user: { select: { name: true, phone: true } } },
    });
  }
  @Put("partners/:id/kyc") async kyc(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: KycDto
  ) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.partner.findUniqueOrThrow({ where: { id } });
      if (
        body.status === "approved" &&
        !before.nidRef.startsWith("DEMO-") &&
        (!before.photoUrl || !before.nidRef.startsWith("/partner/documents/"))
      )
        throw new BadRequestException(
          "Review a private NID document and portrait before approving"
        );
      const after = await tx.partner.update({
        where: { id },
        data: {
          kycStatus: body.status,
          ...(body.status !== "approved" ? { online: false } : {}),
        },
      });
      await this.audit(tx, req.user.id, "partner.kyc", id, before, {
        kycStatus: body.status,
      });
      await this.orders.notify(
        tx,
        after.userId,
        "Partner application updated",
        `Your partner status is ${body.status}.`
      );
      return { id, status: after.kycStatus };
    });
  }
  @Post("rates") async rate(@Req() req: any, @Body() body: RateDto) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.rate.findFirst({
          where: { itemId: body.itemId, areaId: body.areaId },
          orderBy: { effectiveFrom: "desc" },
        }),
        after = await tx.rate.create({
          data: { ...body, updatedBy: req.user.id },
        });
      await this.audit(tx, req.user.id, "rate.set", body.itemId, before, after);
      return after;
    });
  }
  @Get("rates/history") history() {
    return this.db.rate.findMany({
      include: { item: true, area: true },
      orderBy: { effectiveFrom: "desc" },
      take: 200,
    });
  }
  @Get("catalogue") catalogue() {
    return this.db.category.findMany({ include: { items: true } });
  }
  @Put("categories/:id") async category(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: CategoryDto
  ) {
    if (id !== body.id) throw new BadRequestException("ID mismatch");
    return this.db.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id } }),
        after = await tx.category.upsert({
          where: { id },
          create: body,
          update: body,
        });
      await this.audit(tx, req.user.id, "category.save", id, before, after);
      return after;
    });
  }
  @Put("items/:id") async item(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: ItemDto
  ) {
    if (id !== body.id) throw new BadRequestException("ID mismatch");
    return this.db.$transaction(async (tx) => {
      const before = await tx.item.findUnique({ where: { id } }),
        after = await tx.item.upsert({
          where: { id },
          create: body,
          update: body,
        });
      await this.audit(tx, req.user.id, "item.save", id, before, after);
      return after;
    });
  }
  @Get("config") fullConfig() {
    return this.db.config.findUniqueOrThrow({ where: { id: "main" } });
  }
  @Put("config") async config(@Req() req: any, @Body() body: ConfigDto) {
    if (body.expandedRadiusKm < body.radiusKm)
      throw new BadRequestException(
        "Expanded radius must be at least the initial radius"
      );
    return this.db.$transaction(async (tx) => {
      const before = await tx.config.findUniqueOrThrow({
          where: { id: "main" },
        }),
        start = body.slotStartHour ?? before.slotStartHour,
        end = body.slotEndHour ?? before.slotEndHour;
      if (start % 2 !== end % 2 || end - start < 2)
        throw new BadRequestException(
          "Slot hours must allow at least one whole 2-hour slot"
        );
      const after = await tx.config.update({ where: { id: "main" }, data: body });
      await this.audit(tx, req.user.id, "config.save", "main", before, after);
      return after;
    });
  }
  @Post("orders/:id/assign") async assign(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: AssignDto
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${body.partnerId}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const partner = await tx.partner.findUnique({
        where: { id: body.partnerId },
      });
      if (!partner || partner.kycStatus !== "approved")
        throw new BadRequestException("Choose an approved partner");
      if (
        await tx.order.count({
          where: {
            partnerId: partner.id,
            status: { in: ACTIVE as any },
            id: { not: id },
          },
        })
      )
        throw new BadRequestException("Partner has an active pickup");
      const before = await tx.order.findUniqueOrThrow({ where: { id } });
      if (
        !["searching_partner", "no_partner_found", "partner_assigned"].includes(
          before.status
        )
      )
        throw new BadRequestException(
          "Reassignment is unavailable at this stage"
        );
      const after = await tx.order.update({
        where: { id },
        data: { partnerId: partner.id, status: "partner_assigned" },
      });
      await this.audit(tx, req.user.id, "order.assign", id, before, {
        partnerId: partner.id,
      });
      await this.orders.notify(
        tx,
        before.userId,
        "Partner assigned",
        "Admin assigned a verified partner to your pickup.",
        id
      );
      await this.orders.notify(
        tx,
        partner.userId,
        "Pickup assigned",
        "An administrator assigned you a pickup.",
        id
      );
      return { id: after.id, status: after.status };
    });
  }
  @Post("orders/:id/resolve") async resolve(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: ResolveDto
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const before = await tx.order.findUniqueOrThrow({ where: { id } });
      if (before.status !== "disputed")
        throw new BadRequestException("Only disputed orders can be resolved");
      if (body.status === "completed")
        throw new BadRequestException(
          "For cash safety, resolve to weighing and have the seller approve and partner verify OTP using /reopen"
        );
      const after = await tx.order.update({
        where: { id },
        data: { status: "cancelled", cancellationReason: body.reason },
      });
      if (before.creditUsed)
        await tx.creditTxn.create({
          data: {
            userId: before.userId,
            amount: before.creditUsed,
            type: "release",
            reason: "Dispute cancellation credit returned",
            orderId: id,
          },
        });
      await this.audit(tx, req.user.id, "order.resolve", id, before, {
        status: after.status,
        reason: body.reason,
      });
      return { id, status: after.status };
    });
  }
  @Post("orders/:id/reopen") async reopen(
    @Req() req: any,
    @Param("id") id: string
  ) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.order.findUniqueOrThrow({ where: { id } });
      const r = await tx.order.updateMany({
        where: { id, status: "disputed" },
        data: { status: "weighing", weightsApproved: false, otpAttempts: 0 },
      });
      if (!r.count)
        throw new BadRequestException("Only disputed pickups can be reopened");
      await this.audit(tx, req.user.id, "order.reopen", id, before, {
        status: "weighing",
      });
      return { reopened: true };
    });
  }
  @Post("credits") async credit(@Req() req: any, @Body() body: CreditDto) {
    return this.db.$transaction(async (tx) => {
      const result = await tx.creditTxn.create({
        data: { ...body, type: "admin_refund" },
      });
      await this.audit(
        tx,
        req.user.id,
        "credit.refund",
        body.userId,
        null,
        body
      );
      return result;
    });
  }
  @Get("audit") auditLog() {
    return this.db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
  @Get("waitlist") waitlist() {
    return this.db.waitlist.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
}
