import { BadRequestException } from '@nestjs/common';
import { PaginationDto } from '../dtos/pagination.dto';
import { FilterDto } from '../dtos/filter';

export const formatPaginationResult = <T>(
  data: T[],
  page: number,
  entry: number,
  total: number,
) => {
  return {
    data,
    page,
    entry,
    total,
    lastPage: Math.ceil(total / entry),
  };
};

export interface PaginationParams {
  page: number;
  entry: number;
  sort: string;
  field: string;
  offset: number;
  // filters: FilterDto; // Giữ filters ở dạng object
}

export function getPaginationParams(query: PaginationDto): PaginationParams {
  const {
    page = 1,
    entry = 10,
    sort = 'ASC',
    field = 'id',
    // filters = '{}', // Giả sử nhận filters dạng JSON string
  } = query;

  const offset = (page - 1) * entry;

  // let filterObject: Record<string, any> = {};
  // try {
  //   filterObject =
  //     typeof filters === 'string'
  //       ? (JSON.parse(filters) as Record<string, any>)
  //       : (filters as Record<string, any>);
  // } catch (error) {
  //   throw new BadRequestException('Invalid filters format');
  // }

  // return { page, entry, sort, field, offset, filters: filterObject };
  return { page, entry, sort, field, offset };
}
