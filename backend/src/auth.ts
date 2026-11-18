import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
  Get,
  HttpException,
  Injectable,
  Post,
  Put,
  Req,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { randomInt, randomBytes } from "node:crypto";
import { Db } from "./prisma";
import { PhoneDto, ProfileDto, VerifyDto } from "./dto";
import { ACTIVE, hash, same } from "./rules";
export const Roles = (...roles: string[]) => SetMetadata("roles", roles);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private db: Db,
    private jwt: JwtService,
    private reflector: Reflector
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token) throw new UnauthorizedException("Sign in to continue");
    try {
      const claim = await this.jwt.verifyAsync(token);
      if(!claim.sub || claim.scope) throw new Error('Not an access token');
      req.user = await this.db.user.findUnique({ where: { id: claim.sub } });
    } catch {
      throw new UnauthorizedException("Session expired");
    }
    if (!req.user?.active)
      throw new UnauthorizedException("Account unavailable");
    const roles = this.reflector.getAllAndOverride<string[]>("roles", [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles && !roles.includes(req.user.role))
      throw new ForbiddenException("This action requires a different role");
    return true;
  }
}
@ApiTags("Authentication")
@Controller()
export class AuthController {
  constructor(private db: Db, private jwt: JwtService) {}
  @Post("auth/otp")
  @ApiOperation({
    summary:
      "Request SMS OTP. Resend after 30 seconds; expires after 5 minutes.",
  })
  async otp(@Body() body: PhoneDto) {
    const existing = await this.db.otpChallenge.findUnique({
        where: { phone: body.phone },
      }),
      now = new Date();
    if (existing?.lockedUntil && existing.lockedUntil > now)
      throw new HttpException(
        "Too many attempts. Try again in 15 minutes.",
        429
      );
    if (existing && now.getTime() - existing.sentAt.getTime() < 30000)
      throw new HttpException("Wait 30 seconds before resending", 429);
    const code = process.env.DEV_OTP || String(randomInt(100000, 1000000));
    // Serialize resend requests with a row-level advisory lock.
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${body.phone}))`;
      const latest = await tx.otpChallenge.findUnique({
        where: { phone: body.phone },
      });
      if (latest && now.getTime() - latest.sentAt.getTime() < 30000)
        throw new HttpException("Wait 30 seconds before resending", 429);
      await tx.otpChallenge.upsert({
        where: { phone: body.phone },
        create: {
          phone: body.phone,
          hash: hash(body.phone + code),
          expiresAt: new Date(Date.now() + 300000),
        },
        update: {
          hash: hash(body.phone + code),
          expiresAt: new Date(Date.now() + 300000),
          sentAt: now,
          attempts: 0,
          lockedUntil: null,
        },
      });
    });
    if (!process.env.DEV_OTP) {
      try {
        const response = await fetch(process.env.SMS_GATEWAY_URL!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SMS_GATEWAY_TOKEN}`,
          },
          body: JSON.stringify({
            phone: body.phone,
            message: `Your Green Dhaka code is ${code}. Valid for 5 minutes.`,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw Error("SMS failed");
      } catch {
        await this.db.otpChallenge.deleteMany({
          where: { phone: body.phone, hash: hash(body.phone + code) },
        });
        throw new HttpException("SMS is unavailable. Please try again.", 503);
      }
    }
    return { sent: true, resendAfter: 30, development: !!process.env.DEV_OTP };
  }
  @Post("auth/verify")
  async verify(@Body() body: VerifyDto) {
    const result = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${body.phone}))`;
      const challenge = await tx.otpChallenge.findUnique({
        where: { phone: body.phone },
      });
      if (!challenge || challenge.expiresAt < new Date())
        return { error: "Code expired. Request a new code." };
      if (challenge.lockedUntil && challenge.lockedUntil > new Date())
        return { error: "Too many attempts. Try again in 15 minutes." };
      if (!same(challenge.hash, hash(body.phone + body.code))) {
        const attempts = challenge.attempts + 1;
        await tx.otpChallenge.update({
          where: { phone: body.phone },
          data: {
            attempts,
            lockedUntil: attempts >= 5 ? new Date(Date.now() + 900000) : null,
          },
        });
        return { error: "Incorrect verification code" };
      }
      await tx.otpChallenge.delete({ where: { phone: body.phone } });
      let user = await tx.user.findUnique({ where: { phone: body.phone } });
      if (user && !user.active)
        return { error: "This account has been deleted" };
      const deviceHash = body.deviceId ? hash(body.deviceId) : null;
      if (user && deviceHash && !user.deviceHash)
        user = await tx.user.update({
          where: { id: user.id },
          data: { deviceHash },
        });
      if (!user) {
        const ref = body.referralCode
          ? await tx.user.findUnique({
              where: { referralCode: body.referralCode },
            })
          : null;
        const duplicate = deviceHash
          ? await tx.user.findFirst({ where: { deviceHash } })
          : null;
        user = await tx.user.create({
          data: {
            phone: body.phone,
            referralCode: "GD" + randomBytes(4).toString("hex").toUpperCase(),
            deviceHash,
            referredBy: ref && !duplicate ? ref.id : null,
          },
        });
        if (ref && !duplicate)
          await tx.referral.create({
            data: { referrerId: ref.id, refereeId: user.id },
          });
      }
      return { user };
    });
    if (result.error || !result.user)
      throw new UnauthorizedException(result.error);
    return {
      token: await this.jwt.signAsync({ sub: result.user.id }),
      user: result.user,
    };
  }
  @Get("me") @UseGuards(AuthGuard) @ApiBearerAuth() async me(@Req() req: any) {
    return {
      ...req.user,
      partner: await this.db.partner.findUnique({
        where: { userId: req.user.id },
        select: {
          id: true,
          kycStatus: true,
          online: true,
          areaId: true,
          vehicle: true,
          rating: true,
          scaleDetails: true,
        },
      }),
    };
  }
  @Put("me") @UseGuards(AuthGuard) @ApiBearerAuth() async profile(
    @Req() req: any,
    @Body() body: ProfileDto
  ) {
    return this.db.user.update({ where: { id: req.user.id }, data: body });
  }
  @Delete("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async remove(@Req() req: any) {
    const active = await this.db.order.count({
      where: {
        OR: [{ userId: req.user.id }, { partner: { userId: req.user.id } }],
        status: { in: ["created", "searching_partner", ...ACTIVE] as any },
      },
    });
    if (active)
      throw new BadRequestException(
        "Finish or cancel your active pickups before deleting your account"
      );
    await this.db.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId: req.user.id },
        data: { active: false, line1: "Deleted", landmark: "", lat: 0, lng: 0 },
      });
      await tx.partner.updateMany({
        where: { userId: req.user.id },
        data: { online: false, nidRef: "Deleted", photoUrl: "" },
      });
      await tx.user.update({
        where: { id: req.user.id },
        data: { active: false, name: "Deleted user", deviceHash: null },
      });
    });
    return { deleted: true };
  }
}
