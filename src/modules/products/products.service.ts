import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from './entities/product.entity';
import { BaseService } from '../../common/services/base.service';
import { ProductFilterDto } from './dto/product-filter.dto';
import { SearchUtils } from '../../utils/search-utils';

@Injectable()
export class ProductsService extends BaseService<Product> {
  constructor(
    @InjectRepository(Product)
    repository: Repository<Product>,
  ) {
    super(repository, 'product', []);
  }

  protected getSkippedFilterKeys(): string[] {
    return ['name'];
  }

  protected applyCustomFilter(
    queryBuilder: SelectQueryBuilder<any>,
    query: any,
  ): void {
    if (query.name) {
      SearchUtils.applyLevenshteinSearch(
        queryBuilder,
        this.alias,
        'name',
        query.name,
      );
      SearchUtils.addRelevanceScoring(
        queryBuilder,
        this.alias,
        'name',
        query.name,
      );
    }
  }

  async findAllProducts(query: ProductFilterDto) {
    return this.findAll(query);
  }

  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    return this.create(createProductDto);
  }

  async updateProduct(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.update(id, updateProductDto);
  }

  async findProduct(id: number): Promise<Product | null> {
    return await this.findOne(id);
  }

  async removeProduct(id: number) {
    await this.remove(id);
  }
}
