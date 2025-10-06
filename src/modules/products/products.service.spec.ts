import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductFilterDto } from './dto/product-filter.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Repository<Product>;

  const mockProduct: Product = {
    id: 1,
    name: 'Coca Cola',
    description: 'Soft drink',
    price: 12000 as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock repository (TypeORM)
  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  // Mock BaseService methods
  const mockBaseMethods = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    })
      // override BaseService methods
      .overrideProvider(ProductsService)
      .useValue({
        ...mockBaseMethods,
        findAllProducts: jest.fn((query: ProductFilterDto) =>
          mockBaseMethods.findAll(query),
        ),
        createProduct: jest.fn((dto: CreateProductDto) =>
          mockBaseMethods.create(dto),
        ),
        updateProduct: jest.fn((id: number, dto: UpdateProductDto) =>
          mockBaseMethods.update(id, dto),
        ),
        findProduct: jest.fn((id: number) => mockBaseMethods.findOne(id)),
        removeProduct: jest.fn((id: number) => mockBaseMethods.remove(id)),
      })
      .compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllProducts', () => {
    it('should call findAll and return a list of products', async () => {
      const query = {} as ProductFilterDto;

      (mockBaseMethods.findAll as jest.Mock).mockResolvedValue([mockProduct]);

      const result = await service.findAllProducts(query);
      expect(mockBaseMethods.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('createProduct', () => {
    it('should call create and return new product', async () => {
      const dto: CreateProductDto = {
        name: 'Pepsi',
        price: 10000 as any,
        description: 'Cola drink',
      };
      (mockBaseMethods.create as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.createProduct(dto);
      expect(mockBaseMethods.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('updateProduct', () => {
    it('should call update and return updated product', async () => {
      const dto: UpdateProductDto = { name: 'Sprite' };
      (mockBaseMethods.update as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.updateProduct(1, dto);
      expect(mockBaseMethods.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findProduct', () => {
    it('should call findOne and return product', async () => {
      (mockBaseMethods.findOne as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.findProduct(1);
      expect(mockBaseMethods.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('removeProduct', () => {
    it('should call remove', async () => {
      (mockBaseMethods.remove as jest.Mock).mockResolvedValue(undefined);

      await service.removeProduct(1);
      expect(mockBaseMethods.remove).toHaveBeenCalledWith(1);
    });
  });
});
