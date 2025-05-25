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
import { Status } from '../../../common/enums/status.enum';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { IsNotBlank } from '../../../common/validation/is-not-blank.validation';

export class CreateLanguageDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsEnum(Status)
  status: Status;
}
