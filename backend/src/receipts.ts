import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import { Db } from "./prisma";
import { orderInclude } from "./orders";
import { invoicePdf } from "./pdf";
@ApiTags("Invoice downloads")
@Controller("receipts")
export class ReceiptsController {
  constructor(private db: Db, private jwt: JwtService) {}
  @Get(":id.pdf")
  @ApiOperation({
    summary: "Download PDF with a short-lived invoice-only signed link",
  })
  async pdf(
    @Param("id") id: string,
    @Query("token") token: string,
    @Res() res: Response
  ) {
    try {
      const claim = await this.jwt.verifyAsync(token);
      if (claim.scope !== "invoice" || claim.orderId !== id) throw Error();
    } catch {
      throw new UnauthorizedException(
        "Invoice link expired. Generate a new link from the app."
      );
    }
    const order = await this.db.order.findUniqueOrThrow({
      where: { id },
      include: orderInclude,
    });
    if (order.status !== "completed")
      throw new BadRequestException("Invoice is not yet available");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="green-dhaka-${id.slice(
        0,
        8
      )}.pdf"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    });
    res.send(invoicePdf(order));
  }
}
