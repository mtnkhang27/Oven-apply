import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsPositive,
  IsDate,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Multer } from 'multer';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { IsNotBlank } from '../../../common/validation/is-not-blank.validation';

export class ProductFilterDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  price?: number;
}
