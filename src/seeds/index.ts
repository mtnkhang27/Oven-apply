import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { LanguageSeeder } from './language.seeder';
import { Language } from '../modules/languages/entities/language.entity';
async function bootstrap() {
  const app  = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  //Language seeder 
  const languageSeeder = new LanguageSeeder(dataSource.getRepository(Language));
  await languageSeeder.run();
}

bootstrap().catch((err) => {
  console.error('Seeding failed:', err);
});