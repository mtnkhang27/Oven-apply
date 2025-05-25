import { IsObject, IsOptional } from 'class-validator';

export class FilterDto {
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}
