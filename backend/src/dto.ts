import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
export class PhoneDto {
  @ApiProperty({ example: "+8801712345678" })
  @Matches(/^\+8801[3-9]\d{8}$/)
  phone!: string;
}
export class VerifyDto extends PhoneDto {
  @ApiProperty({ example: "123456" }) @Matches(/^\d{6}$/) code!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referralCode?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceId?: string;
}
export class ProfileDto {
  @ApiProperty() @IsString() @Length(1, 80) name!: string;
  @ApiProperty({ enum: ["en", "bn"] }) @IsIn(["en", "bn"]) language!: string;
}
export class AddressDto {
  @ApiProperty() @IsString() @Length(1, 50) areaId!: string;
  @ApiProperty() @IsString() @Length(5, 250) line1!: string;
  @ApiProperty() @IsString() @MaxLength(200) landmark!: string;
  @ApiProperty() @IsString() @Length(1, 40) label!: string;
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
}
export class WaitlistDto {
  @ApiProperty() @IsString() @Length(2, 100) area!: string;
}
export class BookingItemDto {
  @ApiProperty() @IsString() @Length(1, 80) itemId!: string;
  @ApiProperty({ minimum: 0.001, maximum: 10000 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(10000)
  quantity!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
export class BookingDto {
  @ApiProperty() @IsString() addressId!: string;
  @ApiProperty({ enum: ["instant", "scheduled"] })
  @IsIn(["instant", "scheduled"])
  type!: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() slotStart?: string;
  @ApiProperty({ type: [BookingItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  items!: BookingItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() useCredit?: boolean;
}
export class ReasonDto {
  @ApiProperty() @IsString() @Length(3, 500) reason!: string;
}
export class CompleteDto {
  @ApiProperty() @Matches(/^\d{4}$/) otp!: string;
  @ApiProperty({ description: "Partner confirms cash was paid to the seller" })
  @IsBoolean()
  cashPaid!: boolean;
}
export class FinalItemDto {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(10000)
  quantity!: number;
}
export class WeighDto {
  @ApiProperty({ type: [FinalItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FinalItemDto)
  items!: FinalItemDto[];
}
export class PartnerDto {
  @ApiProperty({
    description:
      "Reference to privately verified identity record; never an exposed NID image URL",
  })
  @IsString()
  @Length(5, 200)
  nidRef!: string;
  @ApiProperty() @IsString() @Length(2, 100) vehicle!: string;
  @ApiProperty() @IsString() @Length(3, 200) scaleDetails!: string;
  @ApiProperty() @IsString() areaId!: string;
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
}
export class OnlineDto {
  @ApiProperty() @IsBoolean() online!: boolean;
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
}
export class RatingDto {
  @ApiProperty() @IsInt() @Min(1) @Max(5) stars!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
export class RateDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiProperty() @IsString() areaId!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(1000000) price!: number;
}
export class KycDto {
  @ApiProperty({ enum: ["approved", "suspended", "pending"] })
  @IsIn(["approved", "suspended", "pending"])
  status!: string;
}
export class AssignDto {
  @ApiProperty() @IsString() partnerId!: string;
}
export class ResolveDto {
  @ApiProperty({ enum: ["completed", "cancelled"] })
  @IsIn(["completed", "cancelled"])
  status!: "completed" | "cancelled";
  @ApiProperty() @IsString() @Length(3, 500) reason!: string;
}
export class ConfigDto {
  @ApiProperty() @IsInt() @Min(0) @Max(10000) pickupFee!: number;
  @ApiProperty() @IsInt() @Min(1) @Max(100000) freeThreshold!: number;
  @ApiProperty() @IsInt() @Min(1) @Max(100000) minimumOrder!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(1000) referralAmount!: number;
  @ApiProperty() @IsNumber() @Min(0.5) @Max(20) radiusKm!: number;
  @ApiProperty() @IsNumber() @Min(1) @Max(40) expandedRadiusKm!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) commissionPercent!: number;
  @ApiPropertyOptional({ description: "First slot start, Dhaka hour (6-22)" })
  @IsOptional() @IsInt() @Min(6) @Max(22) slotStartHour?: number;
  @ApiPropertyOptional({ description: "Last slot end, Dhaka hour (8-24)" })
  @IsOptional() @IsInt() @Min(8) @Max(24) slotEndHour?: number;
  @ApiPropertyOptional({ description: "Booking horizon in days (1-30)" })
  @IsOptional() @IsInt() @Min(1) @Max(30) slotDaysAhead?: number;
  @ApiProperty() @IsString() @MaxLength(30) supportPhone!: string;
  @ApiProperty() @IsString() @MaxLength(30) supportWhatsapp!: string;
  @ApiProperty() @IsBoolean() ratesAreDemo!: boolean;
}
export class CategoryDto {
  @ApiProperty() @Matches(/^[a-z0-9-]{2,50}$/) id!: string;
  @ApiProperty() @IsString() @Length(2, 80) name!: string;
  @ApiProperty() @IsString() @Length(1, 80) nameBn!: string;
  @ApiProperty() @IsString() @Length(1, 50) icon!: string;
  @ApiProperty() @Matches(/^#[0-9a-fA-F]{6}$/) color!: string;
  @ApiPropertyOptional({
    nullable: true,
    description: "Partner commission % for this category; null uses global",
  })
  @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPercent?: number | null;
  @ApiProperty() @IsBoolean() active!: boolean;
}
export class ItemDto {
  @ApiProperty() @Matches(/^[a-z0-9-]{2,50}$/) id!: string;
  @ApiProperty() @IsString() categoryId!: string;
  @ApiProperty() @IsString() @Length(2, 80) name!: string;
  @ApiProperty() @IsString() @Length(1, 80) nameBn!: string;
  @ApiProperty() @IsIn(["kg", "pc"]) unit!: string;
  @ApiProperty() @IsBoolean() active!: boolean;
}
export class CreditDto {
  @ApiProperty() @IsString() userId!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(10000) amount!: number;
  @ApiProperty() @IsString() @Length(3, 200) reason!: string;
}
export class EventDto {
  @ApiProperty()
  @IsIn([
    "app_open",
    "address_set",
    "rates_viewed",
    "category_selected",
    "weight_entered",
    "slot_selected",
    "booking_confirmed",
    "partner_assigned",
    "order_cancelled",
    "otp_verified",
    "order_completed",
    "invoice_viewed",
    "referral_shared",
    "rating_submitted",
  ])
  name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiProperty() @IsString() @Length(1, 30) appVersion!: string;
}

export class ConfirmWeightsDto {
  @ApiProperty({
    description: "Version of the final weights displayed to the seller",
  })
  @IsInt()
  @Min(1)
  weighingVersion!: number;
}
