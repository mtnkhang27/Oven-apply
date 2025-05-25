import {
  I18nAsyncOptions,
  // AcceptLanguageResolver,
  QueryResolver,
  HeaderResolver,
} from 'nestjs-i18n';

import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';

export const i18nConfig: I18nAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    fallbackLanguage: configService.getOrThrow('FALLBACK_LANGUAGE'),
    loaderOptions: {
      path: path.join(process.cwd(), 'src/i18n/'), // Base i18n path
      watch: true, // Enables hot-reloading of translations
    },
  }),
  resolvers: [
    new QueryResolver(['lang']), // Example: ?lang=en_US
    new HeaderResolver(['x-lang']), // Example: x-lang: vi_VN
    // new AcceptLanguageResolver(), // Detects language from 'Accept-Language' header
  ],
};
