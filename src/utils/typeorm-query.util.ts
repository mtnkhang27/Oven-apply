import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { addCondition } from '../common/helper/add-query-condition.helper';
import { getPaginationParams } from '../common/helper/pagination.helper';

export function applyPaginationAndFilters<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  offset: number,
  entry: number,
  field: string,
  sort: string,
  alias: string,
) {
  const aliasMetadata = queryBuilder.expressionMap.aliases;

  // Tách field nếu có dạng relation.field (ví dụ: utility.name)
  let fieldWithAlias = '';
  if (field.includes('.')) {
    const [relationAlias, column] = field.split('.');

    const matchedAlias = aliasMetadata.find((a) => a.name === relationAlias);
    if (matchedAlias) {
      fieldWithAlias = `${relationAlias}.${column}`;
    } else {
      console.warn(
        `⚠️ Alias "${relationAlias}" không tồn tại trong query builder.`,
      );
      // fallback về alias chính
      fieldWithAlias = `${alias}.${field}`;
    }
  } else {
    // Trường hợp field là từ entity chính hoặc từ alias 'translation'
    const translationAlias = aliasMetadata.find(
      (a) => a.name === 'translation',
    )?.tablePath;

    let translationFields: string[] = [];
    if (translationAlias) {
      translationFields = queryBuilder.connection
        .getMetadata(translationAlias)
        .columns.map((col) => col.propertyName);
    }

    const isTranslationField = translationFields.includes(field);
    fieldWithAlias = isTranslationField
      ? `translation.${field}`
      : `${alias}.${field}`;
  }

  // Apply sorting
  queryBuilder.orderBy(
    fieldWithAlias,
    sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
  );

  // Apply pagination
  queryBuilder.skip(offset).take(entry);

  return queryBuilder;
}

export function applyFiltersToQueryBuilder<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  query: any,
  alias: string,
  skipKeys: string[] = [], // các key không tính là filter (ví dụ: ['page', 'entry', ...])
) {
  const { offset, entry, page, field, sort } = getPaginationParams(query);

  Object.keys(query).forEach((key) => {
    if (
      query[key] !== undefined &&
      !['page', 'entry', 'sort', 'field', 'offset', ...skipKeys].includes(key)
    ) {
      if (key.endsWith('From')) {
        addCondition(
          queryBuilder,
          key.replace('From', ''),
          query[key],
          alias,
          '>=',
          'from',
        );
      } else if (key.endsWith('To')) {
        addCondition(
          queryBuilder,
          key.replace('To', ''),
          query[key],
          alias,
          '<=',
          'to',
        );
      } else {
        addCondition(queryBuilder, key, query[key], alias);
      }
    }
  });

  applyPaginationAndFilters(queryBuilder, offset, entry, field, sort, alias);
}
