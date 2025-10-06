import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductAttachment } from './entities/product-attachment.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../products/entities/product.entity';
import { FileMetadata, FileNode, FileTree } from '../../utils/file-tree.util';
import { Multer } from 'multer';

@Injectable()
export class ProductAttachmentsService {
  private fileTree: FileTree;
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(ProductAttachment)
    private productAttachmentRepository: Repository<ProductAttachment>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.fileTree = new FileTree(10, [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'pdf',
      'doc',
      'docx',
      'txt',
      'zip',
      'xlsx',
      'csv',
    ]);
    this.initializeFileTree();
  }

  private async initializeFileTree(): Promise<void> {
    const attachments = await this.productAttachmentRepository.find();

    for (const attachment of attachments) {
      const metadata: FileMetadata = {
        originalName: attachment.originalName,
        storedName: attachment.storedName,
        path: attachment.path,
        size: Number(attachment.size),
        extension: attachment.extension,
        mimeType: attachment.mimeType,
        productId: attachment.productId,
        createdAt: attachment.createdAt,
      };

      try {
        this.fileTree.addFile(metadata);
      } catch (error) {
        console.error(`Failed to add file to tree: ${attachment.path}`, error);
      }
    }
  }

  /**
   * Tạo physical path trên file system theo cấu trúc cây
   * VD: path="images/products/photo.jpg" => uploads/1/images/products/photo.jpg
   */
  private getPhysicalPath(productId: number, virtualPath: string): string {
    // Normalize path: bỏ leading/trailing slashes
    const normalizedPath = virtualPath.replace(/^\/+|\/+$/g, '');

    return path.join(this.uploadDir, productId.toString(), normalizedPath);
  }

  async uploadFile(
    productId: number,
    file: Multer.File,
    folderPath: string, // Chỉ cho phép chọn folder: "images", "documents",...
  ): Promise<ProductAttachment> {
    // Verify product exists
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Validate extension
    const extValidation = this.fileTree.validateExtension(file.originalname);
    if (!extValidation.valid) {
      throw new BadRequestException(extValidation.error);
    }

    // **QUAN TRỌNG: Sanitize folder path để tránh path traversal**
    const safeFolderPath = this.sanitizePath(folderPath);

    // Validate folder depth
    const pathValidation = this.fileTree.validatePath(safeFolderPath);
    if (!pathValidation.valid) {
      throw new BadRequestException(pathValidation.error);
    }

    // Generate hashed filename
    const extension = path.extname(file.originalname).toLowerCase();
    const hash = uuidv4();
    const hashedFilename = `${hash}${extension}`;

    // Combine folder + hashed filename
    const virtualPath = path
      .join(safeFolderPath, hashedFilename)
      .replace(/\\/g, '/');
    // VD: "images/products/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"

    // Get physical storage path
    const storagePath = this.getPhysicalPath(productId, virtualPath);

    // Create directory
    const storageDir = path.dirname(storagePath);
    await fs.mkdir(storageDir, { recursive: true });

    // Save file
    await fs.writeFile(storagePath, file.buffer);

    // Create database record
    const attachment = this.productAttachmentRepository.create({
      productId,
      originalName: file.originalname, // Tên gốc để hiển thị
      storedName: hashedFilename, // Tên hash trên disk
      path: virtualPath, // Path đầy đủ
      size: file.size,
      extension: extension.replace('.', ''),
      mimeType: file.mimetype,
      storagePath,
    });

    const savedAttachment =
      await this.productAttachmentRepository.save(attachment);

    // Add to in-memory file tree
    const metadata: FileMetadata = {
      originalName: savedAttachment.originalName,
      storedName: savedAttachment.storedName,
      path: savedAttachment.path,
      size: savedAttachment.size,
      extension: savedAttachment.extension,
      mimeType: savedAttachment.mimeType,
      productId: savedAttachment.productId,
      createdAt: savedAttachment.createdAt,
    };
    this.fileTree.addFile(metadata);

    return savedAttachment;
  }

  /**
   * Sanitize path để ngăn chặn path traversal
   */
  private sanitizePath(inputPath: string): string {
    if (!inputPath) return '';

    // Remove leading/trailing slashes
    const cleaned = inputPath.replace(/^\/+|\/+$/g, '');

    // Remove any ".." or "." components
    const parts = cleaned.split('/').filter((part) => {
      return part && part !== '.' && part !== '..';
    });

    return parts.join('/');
  }

  async getFileTree(productId: number): Promise<FileNode> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.fileTree.buildTree(productId);
  }

  async getFile(
    productId: number,
    filePath: string,
  ): Promise<ProductAttachment> {
    const attachment = await this.productAttachmentRepository.findOne({
      where: { productId, path: filePath },
    });

    if (!attachment) {
      throw new NotFoundException(
        `File not found at path: ${filePath} for product ${productId}`,
      );
    }

    return attachment;
  }

  async downloadFile(productId: number, filePath: string): Promise<Buffer> {
    const attachment = await this.getFile(productId, filePath);

    try {
      return await fs.readFile(attachment.storagePath);
    } catch (error) {
      throw new NotFoundException(
        `File not found on disk: ${attachment.storagePath}`,
      );
    }
  }

  async deleteFile(productId: number, filePath: string): Promise<void> {
    const attachment = await this.getFile(productId, filePath);

    // Delete physical file
    try {
      await fs.unlink(attachment.storagePath);

      // Try to remove empty parent directories
      await this.cleanupEmptyDirectories(attachment.storagePath, productId);
    } catch (error) {
      console.error(
        `Failed to delete file from disk: ${attachment.storagePath}`,
        error,
      );
    }

    // Delete from database
    await this.productAttachmentRepository.remove(attachment);

    // Remove from in-memory tree
    this.fileTree.deleteFile(productId, filePath);
  }

  /**
   * Xóa các thư mục rỗng sau khi xóa file
   */
  private async cleanupEmptyDirectories(
    filePath: string,
    productId: number,
  ): Promise<void> {
    const productDir = path.join(this.uploadDir, productId.toString());
    let currentDir = path.dirname(filePath);

    // Đi ngược lên cây thư mục và xóa nếu rỗng
    while (currentDir !== productDir && currentDir.startsWith(productDir)) {
      try {
        const files = await fs.readdir(currentDir);
        if (files.length === 0) {
          await fs.rmdir(currentDir);
          currentDir = path.dirname(currentDir);
        } else {
          break; // Thư mục không rỗng, dừng lại
        }
      } catch (error) {
        break; // Không thể đọc/xóa, dừng lại
      }
    }
  }

  async deleteFolder(productId: number, folderPath: string): Promise<number> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Normalize folder path
    const normalizedPath = folderPath.replace(/^\/+|\/+$/g, '');

    // Find all files in folder (including subfolders)
    const attachments = await this.productAttachmentRepository
      .createQueryBuilder('attachment')
      .where('attachment.productId = :productId', { productId })
      .andWhere(
        '(attachment.path LIKE :pathWithSlash OR attachment.path = :path)',
        {
          pathWithSlash: `${normalizedPath}/%`,
          path: normalizedPath,
        },
      )
      .getMany();

    // Delete all files
    for (const attachment of attachments) {
      try {
        await fs.unlink(attachment.storagePath);
      } catch (error) {
        console.error(
          `Failed to delete file: ${attachment.storagePath}`,
          error,
        );
      }
      await this.productAttachmentRepository.remove(attachment);
    }

    // Delete physical folder
    const physicalFolderPath = this.getPhysicalPath(productId, normalizedPath);
    try {
      await fs.rm(physicalFolderPath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to delete folder: ${physicalFolderPath}`, error);
    }

    // Remove from in-memory tree
    const deletedCount = this.fileTree.deleteFolder(productId, normalizedPath);

    return deletedCount;
  }

  async getStats(productId: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.fileTree.getStats(productId);
  }

  async listFiles(productId: number): Promise<ProductAttachment[]> {
    return this.productAttachmentRepository.find({
      where: { productId },
      order: { path: 'ASC' },
    });
  }

  /**
   * Scan physical file system and sync with database (optional utility)
   */
  async syncFileSystem(productId: number): Promise<{
    added: number;
    removed: number;
  }> {
    const productDir = path.join(this.uploadDir, productId.toString());

    try {
      const physicalFiles = await this.scanDirectory(productDir, productDir);
      const dbFiles = await this.listFiles(productId);

      const dbPaths = new Set(dbFiles.map((f) => f.path));
      const physicalPaths = new Set(physicalFiles);

      const added = 0;
      let removed = 0;

      // Remove files from DB that don't exist physically
      for (const dbFile of dbFiles) {
        if (!physicalPaths.has(dbFile.path)) {
          await this.productAttachmentRepository.remove(dbFile);
          this.fileTree.deleteFile(productId, dbFile.path);
          removed++;
        }
      }

      return { added, removed };
    } catch (error) {
      console.error('Failed to sync file system', error);
      return { added: 0, removed: 0 };
    }
  }

  private async scanDirectory(dir: string, baseDir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath, baseDir);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const relativePath = path.relative(baseDir, fullPath);
          files.push(relativePath.replace(/\\/g, '/'));
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory: ${dir}`, error);
    }

    return files;
  }
}
