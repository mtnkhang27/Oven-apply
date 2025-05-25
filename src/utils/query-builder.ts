import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { FilterDto } from '../common/dtos/filter';

export function createFilteredQueryBuilder<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  filters: FilterDto,
): SelectQueryBuilder<T> {
  for (const key in filters) {
    if (filters[key]) {
      queryBuilder.andWhere(`${queryBuilder.alias}.${key} LIKE :value`, {
        value: `%${filters[key]}%`,
      });
    }
  }

  return queryBuilder;
}
