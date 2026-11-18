import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Db } from "./prisma";
import { AuthGuard } from "./auth";
import { AddressDto, EventDto, WaitlistDto } from "./dto";
import { availableSlots, distanceKm } from "./rules";
@ApiTags("Catalogue & service areas")
@Controller()
export class MarketController {
  constructor(private db: Db) {}
  @Get("health") async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: "ok", database: "connected" };
  }
  @Get("config") async config() {
    const c = await this.db.config.findUniqueOrThrow({ where: { id: "main" } });
    return {
      ...c,
      commissionPercent: undefined,
      development: !!process.env.DEV_OTP,
    };
  }
  @Get("areas") areas() {
    return this.db.area.findMany({ where: { active: true } });
  }
  @Get("categories") categories() {
    return this.db.category.findMany({
      where: { active: true },
      include: { items: { where: { active: true } } },
      orderBy: { id: "asc" },
    });
  }
  @Get("rates") async rates(@Query("area") area = "dhanmondi") {
    if (!(await this.db.area.findFirst({ where: { id: area, active: true } })))
      throw new BadRequestException("Choose a supported area");
    return this.db.rate.findMany({
      where: {
        areaId: area,
        item: { active: true, category: { active: true } },
      },
      distinct: ["itemId"],
      orderBy: { effectiveFrom: "desc" },
      include: { item: { include: { category: true } } },
    });
  }
  @Get("slots") async slots() {
    const c = await this.db.config.findUniqueOrThrow({ where: { id: "main" } });
    return availableSlots(c);
  }
  @Post("waitlist") @UseGuards(AuthGuard) @ApiBearerAuth() async waitlist(
    @Req() req: any,
    @Body() body: WaitlistDto
  ) {
    return this.db.waitlist.upsert({
      where: { phone_area: { phone: req.user.phone, area: body.area } },
      create: { phone: req.user.phone, area: body.area },
      update: {},
    });
  }
  @Get("addresses") @UseGuards(AuthGuard) @ApiBearerAuth() addresses(
    @Req() req: any
  ) {
    return this.db.address.findMany({
      where: { userId: req.user.id, active: true },
      include: { area: true },
    });
  }
  async validateAddress(body: AddressDto) {
    const area = await this.db.area.findFirst({
      where: { id: body.areaId, active: true },
    });
    if (
      !area ||
      distanceKm(area.lat, area.lng, body.lat, body.lng) > area.radiusKm
    )
      throw new BadRequestException({
        message:
          "This location is outside our launch areas. Join the waitlist.",
        code: "OUTSIDE_SERVICE_AREA",
      });
  }
  @Post("addresses") @UseGuards(AuthGuard) @ApiBearerAuth() async add(
    @Req() req: any,
    @Body() body: AddressDto
  ) {
    await this.validateAddress(body);
    return this.db.address.create({ data: { ...body, userId: req.user.id } });
  }
  @Put("addresses/:id") @UseGuards(AuthGuard) @ApiBearerAuth() async edit(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: AddressDto
  ) {
    await this.validateAddress(body);
    const address = await this.db.address.findFirst({
      where: { id, userId: req.user.id, active: true },
    });
    if (!address) throw new NotFoundException();
    // Addresses already on invoices are immutable. Create a replacement instead.
    await this.db.address.update({ where: { id }, data: { active: false } });
    return this.db.address.create({ data: { ...body, userId: req.user.id } });
  }
  @Delete("addresses/:id") @UseGuards(AuthGuard) @ApiBearerAuth() async remove(
    @Req() req: any,
    @Param("id") id: string
  ) {
    return this.db.address.updateMany({
      where: { id, userId: req.user.id },
      data: { active: false },
    });
  }
  @Get("credit") @UseGuards(AuthGuard) @ApiBearerAuth() async credit(
    @Req() req: any
  ) {
    const history = await this.db.creditTxn.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    return { balance: history.reduce((s, t) => s + t.amount, 0), history };
  }
  @Get("referral") @UseGuards(AuthGuard) @ApiBearerAuth() async referral(
    @Req() req: any
  ) {
    return {
      code: req.user.referralCode,
      amount: (
        await this.db.config.findUniqueOrThrow({ where: { id: "main" } })
      ).referralAmount,
      referrals: await this.db.referral.count({
        where: { referrerId: req.user.id, status: "rewarded" },
      }),
    };
  }
  @Get("notifications") @UseGuards(AuthGuard) @ApiBearerAuth() notifications(
    @Req() req: any
  ) {
    return this.db.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
  @Post("events") @UseGuards(AuthGuard) @ApiBearerAuth() event(
    @Req() req: any,
    @Body() body: EventDto
  ) {
    return this.db.analyticsEvent.create({
      data: { ...body, userId: req.user.id },
    });
  }
}
