export function mapTranslations<T>(
  entity: T,
  translations: any[],
  foreignKey: string, // Tên cột khóa ngoại, có thể truyền động
  extraFields: Partial<any> = {},
): any[] {
  return translations.map((translation) => ({
    ...translation,
    ...extraFields,
    [foreignKey]: (entity as any)?.[foreignKey] || (entity as any)?.id, // Ưu tiên lấy khóa ngoại, fallback về id
  }));
}
