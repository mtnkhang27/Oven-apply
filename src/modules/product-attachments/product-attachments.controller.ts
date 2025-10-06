import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ProductAttachmentsService } from './product-attachments.service';
import { Multer } from 'multer';

@ApiTags('Product Attachments')
@Controller('products/:productId/attachments')
export class ProductAttachmentsController {
  constructor(
    private readonly productAttachmentsService: ProductAttachmentsService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file attachment to a product' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'productId', type: 'number' })
  @ApiQuery({
    name: 'folder', // Đổi từ 'path' sang 'folder'
    type: 'string',
    required: false,
    example: 'images/products',
    description: 'Folder path (system will generate unique filename)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('folder') folderPath: string = '', // Default empty = root
    @UploadedFile() file: Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const productAttachment = await this.productAttachmentsService.uploadFile(
      productId,
      file,
      folderPath,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'File uploaded successfully',
      data: {
        id: productAttachment.id,
        originalName: productAttachment.originalName,
        storedName: productAttachment.storedName, // Thêm để client biết
        path: productAttachment.path,
        size: productAttachment.size,
        extension: productAttachment.extension,
        mimeType: productAttachment.mimeType,
        createdAt: productAttachment.createdAt,
      },
    };
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get file tree structure for a product' })
  @ApiParam({ name: 'productId', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'File tree retrieved successfully',
    schema: {
      example: {
        name: 'root',
        type: 'folder',
        path: '/',
        children: [
          {
            name: 'images',
            type: 'folder',
            path: 'images',
            children: [
              {
                name: 'product.jpg',
                type: 'file',
                path: 'images/product.jpg',
                extension: 'jpg',
                size: 102400,
              },
            ],
          },
        ],
      },
    },
  })
  async getFileTree(@Param('productId', ParseIntPipe) productId: number) {
    const tree = await this.productAttachmentsService.getFileTree(productId);
    return {
      statusCode: HttpStatus.OK,
      data: tree,
    };
  }

  @Get('list')
  @ApiOperation({ summary: 'List all files for a product' })
  @ApiParam({ name: 'productId', type: 'number' })
  async listFiles(@Param('productId', ParseIntPipe) productId: number) {
    const files = await this.productAttachmentsService.listFiles(productId);
    return {
      statusCode: HttpStatus.OK,
      data: files,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get statistics about product attachments' })
  @ApiParam({ name: 'productId', type: 'number' })
  async getStats(@Param('productId', ParseIntPipe) productId: number) {
    const stats = await this.productAttachmentsService.getStats(productId);
    return {
      statusCode: HttpStatus.OK,
      data: stats,
    };
  }

  @Get('download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiParam({ name: 'productId', type: 'number' })
  @ApiQuery({
    name: 'path',
    type: 'string',
    example: 'images/product-photo.jpg',
  })
  async downloadFile(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('path') filePath: string,
    @Res() res: Response,
  ) {
    if (!filePath) {
      throw new BadRequestException('Path parameter is required');
    }

    const productAttachment = await this.productAttachmentsService.getFile(
      productId,
      filePath,
    );
    const fileBuffer = await this.productAttachmentsService.downloadFile(
      productId,
      filePath,
    );

    res.setHeader('Content-Type', productAttachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${productAttachment.originalName}"`,
    );
    res.setHeader('Content-Length', productAttachment.size);
    res.send(fileBuffer);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'productId', type: 'number' })
  @ApiQuery({
    name: 'path',
    type: 'string',
    example: 'images/product-photo.jpg',
  })
  async deleteFile(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('path') filePath: string,
  ) {
    if (!filePath) {
      throw new BadRequestException('Path parameter is required');
    }

    await this.productAttachmentsService.deleteFile(productId, filePath);

    return {
      statusCode: HttpStatus.OK,
      message: 'File deleted successfully',
    };
  }

  @Delete('folder')
  @ApiOperation({ summary: 'Delete a folder and all its contents' })
  @ApiParam({ name: 'productId', type: 'number' })
  @ApiQuery({
    name: 'path',
    type: 'string',
    example: 'images',
  })
  async deleteFolder(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('path') folderPath: string,
  ) {
    if (!folderPath) {
      throw new BadRequestException('Path parameter is required');
    }

    const deletedCount = await this.productAttachmentsService.deleteFolder(
      productId,
      folderPath,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Folder deleted successfully',
      data: {
        deletedFiles: deletedCount,
      },
    };
  }
}
