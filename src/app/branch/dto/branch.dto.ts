import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsNumberString,
  IsOptional,
  IsBoolean,
  Min,
  IsEnum,
} from "class-validator";
import { Currency } from "../enums.ts";

export class BranchIdParamDTO {
  @IsNumberString()
  id!: string;
}

export class CreateBranchDTO {
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  addressText!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsString()
  opensAt!: string;

  @IsString()
  closesAt!: string;

  @IsInt()
  @Min(0)
  deliveryRadius!: number;

  @IsEnum(Currency)
  currency!: Currency;
}

export class UpdateBranchDTO {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressText?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  opensAt?: string;

  @IsOptional()
  @IsString()
  closesAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryRadius?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsBoolean()
  acceptOrders?: boolean;
}

export class UpdateBranchStatusDTO {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  commission?: number;
}
