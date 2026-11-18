import "reflect-metadata";
import "dotenv/config";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  Module,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { resolve } from "node:path";
import { VerificationController } from "./verification";
import { ReceiptsController } from "./receipts";
import { Db } from "./prisma";
import { AuthController, AuthGuard } from "./auth";
import { MarketController } from "./market";
import { OrdersController, OrderService } from "./orders";
import { PartnerController } from "./partner";
import { AdminController } from "./admin";
import { DispatchService } from "./dispatch";
@Catch()
class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (error instanceof HttpException)
      return res
        .status(error.getStatus())
        .json(
          typeof error.getResponse() === "string"
            ? { message: error.message }
            : error.getResponse()
        );
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const status =
        error.code === "P2025"
          ? 404
          : error.code === "P2002"
          ? 409
          : error.code === "P2003"
          ? 400
          : 500;
      return res.status(status).json({
        message:
          status === 404
            ? "Record not found"
            : status === 409
            ? "This record already exists"
            : status === 400
            ? "Invalid record reference"
            : "Database operation failed",
      });
    }
    Logger.error(error);
    return res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
}
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "7d", issuer: "green-dhaka" },
      verifyOptions: { issuer: "green-dhaka" },
    }),
  ],
  controllers: [
    AuthController,
    MarketController,
    OrdersController,
    PartnerController,
    AdminController,
    ReceiptsController,
    VerificationController,
  ],
  providers: [Db, AuthGuard, OrderService, DispatchService],
})
class AppModule {}
async function main() {
  for (const name of ["JWT_SECRET", "OTP_SECRET"])
    if ((process.env[name]?.length || 0) < 32)
      throw new Error(`${name} must contain at least 32 characters`);
  if (
    process.env.NODE_ENV === "production" &&
    (process.env.DEV_OTP ||
      !process.env.SMS_GATEWAY_URL ||
      !process.env.SMS_GATEWAY_TOKEN)
  )
    throw new Error(
      "Production requires a real SMS gateway and DEV_OTP must be empty"
    );
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          upgradeInsecureRequests: null,
        },
      },
    })
  );
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(","),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  app.useGlobalFilters(new Errors());
  app.useStaticAssets(resolve("public"), { prefix: "/admin-panel/" });
  const spec = new DocumentBuilder()
    .setTitle("Green Dhaka API")
    .setDescription(
      "Dhaka scrap marketplace: seller, partner, admin. Cash settlement, locked BDT rates, private handover OTPs. Development OTP is configured in .env."
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, spec), {
    swaggerOptions: { persistAuthorization: false },
  });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3000), "0.0.0.0");
  Logger.log("API :3000 · Swagger /docs · Admin /admin-panel/");
}
void main();
