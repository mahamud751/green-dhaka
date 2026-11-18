import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import { randomBytes, randomInt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Prisma } from "@prisma/client";
import { Db } from "./prisma";
import { AuthGuard, Roles } from "./auth";
import { BookingDto, RatingDto, ReasonDto, ConfirmWeightsDto } from "./dto";
import {
  ACTIVE,
  decrypt,
  encrypt,
  hash,
  totals,
  validSlot,
  slotLabel,
  weightDifference,
} from "./rules";
export const orderInclude = {
  items: { include: { item: true } },
  address: { include: { area: true } },
  partner: {
    include: {
      user: { select: { id: true, name: true, phone: true } },
      _count: { select: { orders: { where: { status: "completed" } } } },
    },
  },
  photos: true,
  ratings: true,
} as const;
export function maskPhone(phone?: string | null) {
  if (!phone) return "";
  const local = phone.replace(/^\+880/, "0");
  return local.length < 7
    ? "•••"
    : `${local.slice(0, 3)}•• ••• ${local.slice(-3)}`;
}
export function cleanOrder(order: any, viewerId: string, role: string) {
  const { otpHash, otpEncrypted, otpAttempts, ...safe } = order;
  if (order.partner) {
    safe.partner = {
      id: order.partner.id,
      name: order.partner.user?.name,
      rating: order.partner.rating,
      photoUrl: order.partner.photoUrl,
      vehicle: order.partner.vehicle,
      kycStatus: order.partner.kycStatus,
      completedPickups: order.partner._count?.orders ?? 0,
      // NFR: phone numbers are masked; calls go through support until a
      // masked-calling provider is configured.
      maskedPhone: maskPhone(order.partner.user?.phone),
    };
    // Seller can see the partner's last reported position only while the
    // pickup is in progress.
    if (["partner_assigned", "on_the_way", "arrived"].includes(order.status))
      Object.assign(safe.partner, {
        lat: order.partner.lat,
        lng: order.partner.lng,
      });
  }
  if (
    order.userId === viewerId &&
    !["completed", "cancelled"].includes(order.status)
  )
    safe.handoverOtp = decrypt(otpEncrypted);
  if (
    order.userId !== viewerId &&
    role !== "ADMIN" &&
    !ACTIVE.includes(order.status)
  )
    safe.address = { area: order.address.area };
  safe.netPayout = Math.max(
    0,
    (order.finalValue ?? order.estimatedValue) -
      order.fee +
      Math.min(order.creditUsed, order.fee)
  );
  safe.hasWeightDifference = order.items?.some(
    (i: any) =>
      i.finalQty !== null &&
      weightDifference(Number(i.estimatedQty), Number(i.finalQty))
  );
  return safe;
}
@Injectable()
export class OrderService {
  constructor(public db: Db) {}
  async owned(id: string, user: any) {
    const o = await this.db.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!o) throw new NotFoundException("Pickup not found");
    if (
      o.userId !== user.id &&
      o.partner?.userId !== user.id &&
      user.role !== "ADMIN"
    )
      throw new ForbiddenException();
    return o;
  }
  async notify(
    tx: Prisma.TransactionClient,
    userId: string,
    title: string,
    body: string,
    orderId?: string
  ) {
    await tx.notification.create({ data: { userId, title, body, orderId } });
  }
  async reward(tx: Prisma.TransactionClient, order: any) {
    const referral = await tx.referral.findFirst({
      where: { refereeId: order.userId, status: "pending" },
    });
    if (!referral) return;
    const completed = await tx.order.count({
      where: { userId: order.userId, status: "completed" },
    });
    if (completed !== 1) return;
    const [referrer, referee] = await Promise.all([
      tx.user.findUnique({
        where: { id: referral.referrerId },
        include: { addresses: true },
      }),
      tx.user.findUnique({ where: { id: order.userId } }),
    ]);
    const address = await tx.address.findUniqueOrThrow({
      where: { id: order.addressId },
    });
    const duplicate =
      (referrer?.deviceHash && referrer.deviceHash === referee?.deviceHash) ||
      referrer?.addresses.some(
        (a) =>
          a.line1.trim().toLowerCase() === address.line1.trim().toLowerCase() &&
          a.areaId === address.areaId
      );
    if (duplicate) {
      await tx.referral.update({
        where: { id: referral.id },
        data: { status: "blocked" },
      });
      return;
    }
    const config = await tx.config.findUniqueOrThrow({ where: { id: "main" } });
    await tx.referral.update({
      where: { id: referral.id },
      data: { status: "rewarded" },
    });
    for (const userId of [referral.referrerId, order.userId])
      await tx.creditTxn.create({
        data: {
          userId,
          amount: config.referralAmount,
          type: "referral",
          reason: "First pickup referral reward",
          orderId: order.id,
        },
      });
  }
}
@ApiTags("Seller pickups")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(
    private db: Db,
    private service: OrderService,
    private jwt: JwtService
  ) {}
  @Post()
  @Roles("SELLER", "ADMIN")
  @ApiOperation({
    summary: "Book pickup with current area rates locked atomically",
  })
  async create(@Req() req: any, @Body() body: BookingDto) {
    if (new Set(body.items.map((i) => i.itemId)).size !== body.items.length)
      throw new BadRequestException("Duplicate materials");
    if (body.type === "scheduled") {
      const slots = await this.db.config.findUniqueOrThrow({
        where: { id: "main" },
      });
      if (
        !body.slotStart ||
        !validSlot(new Date(body.slotStart), new Date(), slots)
      )
        throw new BadRequestException(slotLabel(slots));
    }
    const order = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user.id}))`;
      const address = await tx.address.findFirst({
        where: {
          id: body.addressId,
          userId: req.user.id,
          active: true,
          area: { active: true },
        },
      });
      if (!address)
        throw new BadRequestException("Choose a saved pickup address");
      const config = await tx.config.findUniqueOrThrow({
          where: { id: "main" },
        }),
        items = [];
      for (const i of body.items) {
        const rate = await tx.rate.findFirst({
          where: {
            itemId: i.itemId,
            areaId: address.areaId,
            item: { active: true, category: { active: true } },
          },
          orderBy: { effectiveFrom: "desc" },
          include: { item: true },
        });
        if (!rate)
          throw new BadRequestException("No active rate for this material");
        if (rate.item.unit === "pc" && !Number.isInteger(i.quantity))
          throw new BadRequestException(
            "Piece quantities must be whole numbers"
          );
        items.push({
          itemId: i.itemId,
          estimatedQty: i.quantity,
          lockedRate: rate.price,
          notes: i.notes || "",
        });
      }
      const total = totals(
        items.map((i) => ({ qty: i.estimatedQty, rate: i.lockedRate })),
        config
      );
      if (total.value < config.minimumOrder)
        throw new BadRequestException(
          `Minimum estimated scrap value is ৳${config.minimumOrder}`
        );
      const balance = body.useCredit
        ? (
            await tx.creditTxn.aggregate({
              where: { userId: req.user.id },
              _sum: { amount: true },
            })
          )._sum.amount || 0
        : 0;
      const creditUsed = Math.min(balance, total.fee),
        otp = String(randomInt(1000, 10000));
      const o = await tx.order.create({
        data: {
          userId: req.user.id,
          addressId: address.id,
          type: body.type,
          status: "searching_partner",
          slotStart:
            body.type === "scheduled" ? new Date(body.slotStart!) : null,
          slotEnd:
            body.type === "scheduled"
              ? new Date(new Date(body.slotStart!).getTime() + 7200000)
              : null,
          estimatedValue: total.value,
          fee: total.fee,
          creditUsed,
          otpHash: hash(otp),
          otpEncrypted: encrypt(otp),
          items: { create: items },
        },
        include: orderInclude,
      });
      if (creditUsed)
        await tx.creditTxn.create({
          data: {
            userId: req.user.id,
            amount: -creditUsed,
            type: "reservation",
            reason: "Pickup fee credit reserved",
            orderId: o.id,
          },
        });
      await this.service.notify(
        tx,
        req.user.id,
        "Pickup booked",
        "We are finding a verified recycling partner.",
        o.id
      );
      return o;
    });
    return cleanOrder(order, req.user.id, req.user.role);
  }
  @Get() async list(@Req() req: any) {
    const orders = await this.db.order.findMany({
      where: { userId: req.user.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return orders.map((o) => cleanOrder(o, req.user.id, req.user.role));
  }
  @Get(":id") async detail(@Req() req: any, @Param("id") id: string) {
    return cleanOrder(
      await this.service.owned(id, req.user),
      req.user.id,
      req.user.role
    );
  }
  @Get(":id/track") async track(@Req() req: any, @Param("id") id: string) {
    const o = await this.service.owned(id, req.user);
    return {
      ...cleanOrder(o, req.user.id, req.user.role),
      etaMinutes:
        o.status === "on_the_way"
          ? 30
          : o.status === "partner_assigned"
          ? 60
          : null,
      etaDescription: "Dispatch estimate; traffic and rain may cause delays",
      fallback:
        o.status === "no_partner_found"
          ? "No partner available. Please schedule a new pickup."
          : null,
    };
  }
  @Post(":id/cancel") async cancel(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: ReasonDto
  ) {
    const result = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const o = await tx.order.findUnique({
        where: { id },
        include: { partner: true },
      });
      if (!o) throw new NotFoundException();
      if (o.userId !== req.user.id && req.user.role !== "ADMIN")
        throw new ForbiddenException();
      if (["completed", "cancelled", "disputed"].includes(o.status))
        throw new BadRequestException("This pickup cannot be cancelled");
      const late = ["on_the_way", "arrived", "weighing"].includes(o.status),
        month = new Date();
      month.setUTCDate(1);
      month.setUTCHours(0, 0, 0, 0);
      const count = await tx.order.count({
        where: {
          userId: o.userId,
          status: "cancelled",
          updatedAt: { gte: month },
          cancellationReason: { startsWith: "[late]" },
        },
      });
      const cancellationFee = late && count >= 2 ? 30 : 0;
      await tx.order.update({
        where: { id },
        data: {
          status: "cancelled",
          cancellationReason: (late ? "[late] " : "") + body.reason,
          cancellationFee,
        },
      });
      if (req.user.role === "ADMIN")
        await tx.auditLog.create({
          data: {
            actor: req.user.id,
            action: "order.cancel",
            entity: id,
            before: { status: o.status },
            after: { reason: body.reason, cancellationFee },
          },
        });
      if (o.creditUsed)
        await tx.creditTxn.create({
          data: {
            userId: o.userId,
            amount: o.creditUsed,
            type: "release",
            reason: "Cancelled pickup credit returned",
            orderId: id,
          },
        });
      await this.service.notify(
        tx,
        o.userId,
        "Pickup cancelled",
        cancellationFee
          ? "A ৳30 cancellation fee is recorded; support will arrange collection."
          : "Your pickup has been cancelled.",
        id
      );
      return { cancelled: true, cancellationFee };
    });
    return result;
  }
  @Post(":id/confirm")
  @ApiOperation({
    summary: "Seller approves final item weights before handover OTP is shared",
  })
  async confirm(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: ConfirmWeightsDto
  ) {
    const changed = await this.db.order.updateMany({
      where: {
        id,
        userId: req.user.id,
        status: "weighing",
        finalValue: { not: null },
        weighingVersion: body.weighingVersion,
      },
      data: { weightsApproved: true },
    });
    if (!changed.count)
      throw new BadRequestException(
        "The final weights changed or are not ready. Review the latest weights before approving"
      );
    return { approved: true };
  }
  @Post(":id/dispute") async dispute(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: ReasonDto
  ) {
    const changed = await this.db.order.updateMany({
      where: { id, userId: req.user.id, status: "weighing" },
      data: {
        status: "disputed",
        weightsApproved: false,
        cancellationReason: body.reason,
      },
    });
    if (!changed.count)
      throw new BadRequestException(
        "Only a pickup being weighed can be disputed"
      );
    return { disputed: true };
  }
  @Post(":id/photos")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024, files: 1 } })
  )
  async photo(
    @Req() req: any,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    const o = await this.service.owned(id, req.user);
    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
    )
      throw new BadRequestException("Upload JPEG, PNG, or WebP, up to 5MB");
    const b = file.buffer,
      valid =
        file.mimetype === "image/jpeg"
          ? b[0] === 255 && b[1] === 216
          : file.mimetype === "image/png"
          ? b.subarray(1, 4).toString() === "PNG"
          : b.subarray(8, 12).toString() === "WEBP";
    if (!valid) throw new BadRequestException("Invalid image content");
    if (["completed", "cancelled"].includes(o.status))
      throw new BadRequestException("Pickup photos are locked");
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      if (
        (await tx.orderPhoto.count({
          where: { orderId: id, uploadedBy: req.user.id },
        })) >= 5
      )
        throw new BadRequestException(
          "Maximum 5 photos per person for a pickup"
        );
      const name =
        randomBytes(16).toString("hex") +
        { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[
          file.mimetype
        ];
      await mkdir(resolve("uploads"), { recursive: true });
      await writeFile(resolve("uploads", name), b);
      return tx.orderPhoto.create({
        data: {
          orderId: id,
          url: `/orders/${id}/photos/${name}`,
          uploadedBy: req.user.id,
        },
      });
    });
  }
  @Get(":id/photos/:name") async file(
    @Req() req: any,
    @Param("id") id: string,
    @Param("name") name: string,
    @Res() res: Response
  ) {
    await this.service.owned(id, req.user);
    if (
      !/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name) ||
      !(await this.db.orderPhoto.findFirst({
        where: { orderId: id, url: `/orders/${id}/photos/${name}` },
      }))
    )
      throw new NotFoundException();
    return res.sendFile(resolve("uploads", name));
  }
  @Get(":id/invoice") async invoice(@Req() req: any, @Param("id") id: string) {
    const o = await this.service.owned(id, req.user);
    if (o.status !== "completed")
      throw new BadRequestException(
        "Invoice is available after cash settlement"
      );
    return {
      ...cleanOrder(o, req.user.id, req.user.role),
      currency: "BDT",
      settlement: "Cash paid at the door",
      issuedAt: o.updatedAt,
    };
  }
  @Post(":id/invoice/share")
  async shareInvoice(@Req() req: any, @Param("id") id: string) {
    const order = await this.service.owned(id, req.user);
    if (order.status !== "completed")
      throw new BadRequestException("Complete the pickup first");
    const token = await this.jwt.signAsync(
      { scope: "invoice", orderId: id },
      { expiresIn: "5m" }
    );
    return { url: `/receipts/${id}.pdf?token=${token}`, expiresIn: 300 };
  }
  @Post(":id/rating") async rating(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: RatingDto
  ) {
    const o = await this.service.owned(id, req.user);
    if (
      o.status !== "completed" ||
      !o.partner ||
      (req.user.role === "ADMIN" && o.userId !== req.user.id)
    )
      throw new BadRequestException("Complete the pickup first");
    const toId = o.userId === req.user.id ? o.partner.userId : o.userId;
    return this.db.$transaction(async (tx) => {
      const rating = await tx.rating.upsert({
        where: { orderId_fromId: { orderId: id, fromId: req.user.id } },
        create: {
          orderId: id,
          fromId: req.user.id,
          toId,
          stars: body.stars,
          comment: body.comment || "",
        },
        update: { stars: body.stars, comment: body.comment || "" },
      });
      if (toId === o.partner!.userId) {
        const average = await tx.rating.aggregate({
          where: { toId },
          _avg: { stars: true },
        });
        await tx.partner.update({
          where: { id: o.partner!.id },
          data: { rating: average._avg.stars || 0 },
        });
      }
      return rating;
    });
  }
}
