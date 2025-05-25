import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LanguagesModule } from './modules/languages/languages.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { I18nModule } from 'nestjs-i18n';
import { i18nConfig } from './config/i18n.config';
import swaggerConfig from './config/swagger.config';
import { typeOrmConfig } from './config/typeorm.config';

let staticModules;
if (process.env.NODE_ENV === 'production') {
  staticModules = ServeStaticModule.forRoot({
    rootPath: '/mnt/tikera/uploads',
    serveRoot: '/uploads',
  });
} else {
  staticModules = ServeStaticModule.forRoot({
    rootPath: join(__dirname, '..', 'public/uploads'),
    serveRoot: '/uploads',
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [swaggerConfig],
      isGlobal: true, // Đảm bảo module này khả dụng toàn cầu
    }),
    staticModules,
    TypeOrmModule.forRootAsync(typeOrmConfig),
    I18nModule.forRootAsync(i18nConfig),
    LanguagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
