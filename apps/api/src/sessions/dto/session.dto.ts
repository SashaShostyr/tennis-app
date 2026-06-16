import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ParticipantRole, SessionType, Surface } from '@prisma/client';

export class ParticipantDto {
  @IsString()
  contactId!: string;

  @IsEnum(ParticipantRole)
  role!: ParticipantRole;
}

export class CreateSessionDto {
  @IsDateString()
  date!: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  durationMin!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsEnum(Surface)
  surface!: Surface;

  @IsOptional()
  @IsBoolean()
  indoor?: boolean;

  @IsEnum(SessionType)
  type!: SessionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  feelRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  energyRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  funRating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];
}

// All fields optional for PATCH. Reuses the same validation rules.
export class UpdateSessionDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsEnum(Surface)
  surface?: Surface;

  @IsOptional()
  @IsBoolean()
  indoor?: boolean;

  @IsOptional()
  @IsEnum(SessionType)
  type?: SessionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  feelRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  energyRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  funRating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];
}

export class ListSessionsQueryDto {
  @IsOptional()
  @IsEnum(SessionType)
  type?: SessionType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
