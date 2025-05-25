import e from 'express';
import { SelectQueryBuilder, EntityMetadata } from 'typeorm';

export function addCondition(
  queryBuilder: SelectQueryBuilder<any>,
  fieldName: string,
  value?: string | number | Date,
  alias: string = 'apartment',
  operator: string = '=', // Default operator
  paramSuffix?: string, // 👉 NEW: optional param key suffix
) {
  if (value === undefined || value === null) return;

  const fieldKey = fieldName.replace(/\./g, '_');
  const suffix = paramSuffix ? `_${paramSuffix}` : '';
  const paramKey = `${alias}_${fieldKey}${suffix}`; // Avoid param collisions

  // Metadata để kiểm tra kiểu dữ liệu
  const metadata: EntityMetadata = queryBuilder.connection.getMetadata(alias);
  const columnMetadata = metadata.columns.find(
    (col) => col.propertyName === fieldName,
  );

  const isEnum = columnMetadata?.enum !== undefined;
  if (isEnum && typeof value === 'string') {
    queryBuilder.andWhere(`"${alias}"."${fieldName}" IN (:...${paramKey})`, {
      [paramKey]: value.split(','),
    });
    return;
  }

  const isDate =
    columnMetadata?.type === 'date' || columnMetadata?.type === 'timestamp';

  if (isDate && typeof value === 'string') {
    if (operator == '=') {
      queryBuilder.andWhere(
        `CAST("${alias}"."${fieldName}" AS TEXT) ILIKE :${paramKey}`,
        { [paramKey]: `%${value}%` },
      );
    }
    // Nếu là các operator khác (>, <...), sẽ rơi vào nhánh cuối cùng
  }

  // Xử lý ID
  if (operator === '=' && fieldName.toLowerCase().includes('id')) {
    queryBuilder.andWhere(`"${alias}"."${fieldName}" = :${paramKey}`, {
      [paramKey]: value,
    });
  }
  // Xử lý chuỗi (text search)
  else if (operator === '=' && typeof value === 'string') {
    queryBuilder.andWhere(
      `"${alias}"."${fieldName}"::TEXT ILIKE :${paramKey}`,
      {
        [paramKey]: `%${value}%`,
      },
    );
  }
  // Xử lý số hoặc các so sánh
  else {
    queryBuilder.andWhere(
      `"${alias}"."${fieldName}" ${operator} :${paramKey}`,
      {
        [paramKey]: value,
      },
    );
  }

  // Debug
  console.log('SQL:', queryBuilder.getSql());
  console.log('Params:', queryBuilder.getParameters());
}