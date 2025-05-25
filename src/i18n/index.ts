import { I18nContext } from 'nestjs-i18n';

/**
 * Shortcut function for translation.
 * Ensures `I18nContext.current()` is used automatically.
 */
export function t(key: string, args?: Record<string, any>): string {
  const i18n = I18nContext.current();
  if (!i18n) {
    throw new Error(
      'I18nContext is not available. Make sure it is used within a request context.',
    );
  }
  return i18n.t(key, args);
}
