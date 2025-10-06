import { Test, TestingModule } from '@nestjs/testing';
import { ProductAttachmentsController } from './product-attachments.controller';
import { ProductAttachmentsService } from './product-attachments.service';

describe('ProductAttachmentsController', () => {
  let controller: ProductAttachmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductAttachmentsController],
      providers: [ProductAttachmentsService],
    }).compile();

    controller = module.get<ProductAttachmentsController>(ProductAttachmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
