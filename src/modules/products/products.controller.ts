import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { UploadFiles } from '../../common/decorators/upload.helper';
import { Multer } from 'multer';
import { ProductFilterDto } from './dto/product-filter.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Get all Products with filters' })
  @ApiResponse({ status: 200, description: 'List of Products' })
  @Get()
  async findAll(@Query() query: ProductFilterDto) {
    return await this.productsService.findAllProducts(query);
  }

  @ApiOperation({ summary: 'Create a new Product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return await this.productsService.createProduct(createProductDto);
  }

  @ApiOperation({ summary: 'Update an existing Product' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Product to update.',
    type: 'string',
    example: 1,
  })
  @ApiBody({
    description: 'Provide the updated data for the Product.',
    type: UpdateProductDto,
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return await this.productsService.updateProduct(+id, updateProductDto);
  }

  @ApiOperation({ summary: 'Get a Product by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Product to retrieve.',
    type: 'string',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.productsService.findProduct(+id);
  }

  @ApiOperation({ summary: 'Delete a Product by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Product to delete.',
    type: 'string',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.productsService.removeProduct(+id);
  }
}
