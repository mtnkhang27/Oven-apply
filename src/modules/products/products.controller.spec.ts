import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    findAllProducts: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    findProduct: jest.fn(),
    removeProduct: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call findAllProducts and return a list of products', async () => {
      const query: ProductFilterDto = {
        page: 1,
        entry: 10,
        sort: 'ASC',
        field: 'id',
      };
      const expectedResult = [{ id: 1, name: 'Product 1' }];
      jest
        .spyOn(service, 'findAllProducts')
        .mockResolvedValue(expectedResult as any);

      const result = await controller.findAll(query);
      expect(service.findAllProducts).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createProduct', () => {
    it('should call createProduct and return created product', async () => {
      const dto: CreateProductDto = { name: 'Product 1' } as any;
      const expected = { id: 1, ...dto };
      jest.spyOn(service, 'createProduct').mockResolvedValue(expected as any);

      const response = await controller.createProduct(dto);
      expect(service.createProduct).toHaveBeenCalledWith(dto);
      expect(response).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call updateProduct and return updated product', async () => {
      const dto: UpdateProductDto = { name: 'Updated Product' } as any;
      const expected = { id: 1, ...dto };
      jest.spyOn(service, 'updateProduct').mockResolvedValue(expected as any);

      const response = await controller.update('1', dto);
      expect(service.updateProduct).toHaveBeenCalledWith(1, dto);
      expect(response).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call findProduct and return product', async () => {
      const expected = { id: 1, name: 'Product 1' };
      jest.spyOn(service, 'findProduct').mockResolvedValue(expected as any);

      const result = await controller.findOne('1');
      expect(service.findProduct).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call removeProduct', async () => {
      jest.spyOn(service, 'removeProduct').mockResolvedValue(undefined);

      await controller.remove('1');
      expect(service.removeProduct).toHaveBeenCalledWith(1);
    });
  });
});
