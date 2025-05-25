import { Module, Global } from '@nestjs/common';
import { I18nModule } from 'nestjs-i18n';
import { BaseService } from './base.service';

@Global()
@Module({
  imports: [I18nModule], // Import I18n vào module
  providers: [BaseService], // Đăng ký BaseService
  exports: [BaseService], // Xuất để các module khác dùng
})
export class CommonModule {}
