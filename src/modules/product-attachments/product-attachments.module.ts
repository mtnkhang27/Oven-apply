import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductAttachment } from './entities/product-attachment.entity';
import { Product } from '../products/entities/product.entity';
import { ProductAttachmentsController } from './product-attachments.controller';
import { ProductAttachmentsService } from './product-attachments.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductAttachment, Product])],
  controllers: [ProductAttachmentsController],
  providers: [ProductAttachmentsService],
  exports: [ProductAttachmentsService],
})
export class ProductAttachmentsModule {}
