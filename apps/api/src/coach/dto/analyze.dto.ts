import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ShotType, Handedness } from '@prisma/client';

const METRIC_STATUSES = ['good', 'check', 'needs-work'] as const;

export class MetricDto {
  @IsString()
  @MaxLength(120)
  label!: string;

  // number | null
  @IsOptional()
  @IsNumber()
  value!: number | null;

  @IsString()
  @MaxLength(8)
  unit!: string;

  @IsIn(METRIC_STATUSES)
  status!: (typeof METRIC_STATUSES)[number];

  @IsString()
  @MaxLength(500)
  note!: string;
}

export class AnalyzeDto {
  @IsEnum(ShotType)
  shotType!: ShotType;

  @IsEnum(Handedness)
  handedness!: Handedness;

  @IsOptional()
  @IsBoolean()
  twoHandedBackhand?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricDto)
  metrics!: MetricDto[];

  // ~3 base64 JPEG keyframes (no data: prefix).
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  keyframes!: string[];

  @IsOptional()
  @IsString()
  sessionId?: string;
}
