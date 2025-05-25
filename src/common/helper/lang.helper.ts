import { I18nContext } from 'nestjs-i18n';

export function getCurrentLang() {
  return I18nContext.current()?.lang;
}
