import { Test, TestingModule } from '@nestjs/testing';
import { ProductAttachmentsService } from './product-attachments.service';

describe('ProductAttachmentsService', () => {
  let service: ProductAttachmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductAttachmentsService],
    }).compile();

    service = module.get<ProductAttachmentsService>(ProductAttachmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
