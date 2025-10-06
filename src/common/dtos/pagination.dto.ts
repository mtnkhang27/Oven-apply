import { IsInt, IsOptional, Min, Max, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Current page, starting from 1',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (maximum 100)',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  entry?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort order, either ascending (ASC) or descending (DESC)',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sort?: 'ASC' | 'DESC' = 'ASC';

  @ApiPropertyOptional({
    description: 'Field to sort the data by',
    example: 'id',
    default: 'id',
  })
  @IsOptional()
  @IsString()
  field?: string = 'id';
}
