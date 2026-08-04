import {
  IsNumberString,
  IsEmail,
  IsEnum,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsStrongPassword,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { RestaurantStatus } from "../enums.ts";

export class RestaurantIdParamDTO {
  @IsNumberString()
  id!: string;
}

export class CreateRestaurantOwnerDTO {
  @IsEmail()
  email!: string;

  @MinLength(10)
  @MaxLength(11)
  phone!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        "Password is not strong enough. It must contain at least 8 characters, one uppercase letter, one lowercase letter, one number & one special character.",
    },
  )
  password!: string;
}

export class CreateRestaurantDTO {
  @ValidateNested()
  @Type(() => CreateRestaurantOwnerDTO)
  owner!: CreateRestaurantOwnerDTO;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsString()
  @MinLength(1)
  primaryCountry!: string;
}

export class UpdateRestaurantDTO {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  primaryCountry?: string;
}

export class UpdateRestaurantStatusDTO {
  @IsEnum(RestaurantStatus)
  status!: RestaurantStatus;
}
