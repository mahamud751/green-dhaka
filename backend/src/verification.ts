import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Db } from "./prisma";
import { AuthGuard } from "./auth";
import { ACTIVE } from "./rules";
@ApiTags("Private partner verification")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("partner")
export class VerificationController {
  constructor(private db: Db) {}
  @Post("verification/:kind")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiOperation({
    summary:
      "Upload private NID or portrait. Requires partner onboarding; replacing documents resets approval.",
  })
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024, files: 1 } })
  )
  async upload(
    @Req() req: any,
    @Param("kind") kind: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!["nid", "portrait"].includes(kind))
      throw new BadRequestException("Choose nid or portrait");
    const partner = await this.db.partner.findUnique({
      where: { userId: req.user.id },
    });
    if (!partner) throw new BadRequestException("Apply as a partner first");
    if (
      await this.db.order.count({
        where: { partnerId: partner.id, status: { in: ACTIVE as any } },
      })
    )
      throw new BadRequestException(
        "Finish active pickups before changing verification documents"
      );
    const b = file?.buffer;
    const jpeg =
        file?.mimetype === "image/jpeg" && b?.[0] === 255 && b?.[1] === 216,
      png =
        file?.mimetype === "image/png" &&
        b?.subarray(1, 4).toString() === "PNG";
    if (!jpeg && !png)
      throw new BadRequestException("Upload a valid JPEG or PNG, up to 5MB");
    const name = randomBytes(16).toString("hex") + (jpeg ? ".jpg" : ".png"),
      url = `/partner/documents/${partner.id}/${kind}/${name}`;
    await mkdir(resolve("uploads", "verification"), { recursive: true });
    await writeFile(resolve("uploads", "verification", name), b);
    await this.db.$transaction(async (tx) => {
      await tx.partner.update({
        where: { id: partner.id },
        data: {
          ...(kind === "nid" ? { nidRef: url } : { photoUrl: url }),
          kycStatus: "pending",
          online: false,
        },
      });
      await tx.auditLog.create({
        data: {
          actor: req.user.id,
          action: "partner.document",
          entity: partner.id,
          after: { kind, uploaded: true },
        },
      });
    });
    return { url, status: "pending" };
  }
  @Get("documents/:id/:kind/:name")
  async document(
    @Req() req: any,
    @Param("id") id: string,
    @Param("kind") kind: string,
    @Param("name") name: string,
    @Res() res: Response
  ) {
    const p = await this.db.partner.findUnique({ where: { id } });
    if (
      !p ||
      !["nid", "portrait"].includes(kind) ||
      !/^[a-f0-9]{32}\.(jpg|png)$/.test(name)
    )
      throw new NotFoundException();
    const path = `/partner/documents/${id}/${kind}/${name}`;
    if ((kind === "nid" ? p.nidRef : p.photoUrl) !== path)
      throw new NotFoundException();
    const customer =
      kind === "portrait" &&
      (await this.db.order.count({
        where: { partnerId: id, userId: req.user.id },
      })) > 0;
    if (req.user.id !== p.userId && req.user.role !== "ADMIN" && !customer)
      throw new ForbiddenException("Identity documents are private");
    res.set("Cache-Control", "private, no-store");
    return res.sendFile(resolve("uploads", "verification", name));
  }
}
