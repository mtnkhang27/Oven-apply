// src/seeder/language.seeder.ts
import { Repository } from 'typeorm';
import { Language } from '../modules/languages/entities/language.entity';
import { Status } from '../common/enums/status.enum';

export class LanguageSeeder {
  constructor(private readonly repo: Repository<Language>) {}

  async run() {
    const data = [
      {
        id: 1,
        name: 'Tiếng Việt',
        code: 'vi_VN',
        status: Status.ACTIVE,
      },
      {
        id: 2,
        name: 'English',
        code: 'en_US',
        status: Status.ACTIVE,
      },
    ];

    for (const item of data) {
      const exists = await this.repo.findOneBy({ id: item.id });
      if (!exists) {
        await this.repo.insert(item);
      }
    }

    // Cập nhật lại sequence cho cột ID (nếu là PostgreSQL)
    await this.repo.query(`
      SELECT setval(
        pg_get_serial_sequence('language', 'id'),
        GREATEST((SELECT MAX(id) FROM language), 1)
      )
    `);
  }
}
