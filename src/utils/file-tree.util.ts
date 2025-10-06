import { HashMap } from './hashmap.util';

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  extension?: string;
  size?: number;
  children?: FileNode[];
  createdAt: Date;
  updatedAt: Date;
  originalName?: string; // ← Tên file gốc khi upload
  storedName?: string; // ← Tên file lưu trữ
  mimeType?: string; // ← MIME type
}

export interface FileMetadata {
  originalName: string;
  storedName: string;
  path: string;
  size: number;
  extension: string;
  mimeType: string;
  productId: number;
  createdAt: Date;
}

export class FileTree {
  private fileMap: HashMap<string, FileMetadata>;
  private readonly maxDepth: number;
  private readonly allowedExtensions: Set<string>;

  constructor(
    maxDepth = 10,
    allowedExtensions = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'pdf',
      'doc',
      'docx',
      'txt',
      'zip',
    ],
  ) {
    this.fileMap = new HashMap<string, FileMetadata>();
    this.maxDepth = maxDepth;
    this.allowedExtensions = new Set(
      allowedExtensions.map((ext) => ext.toLowerCase()),
    );
  }

  private getDepth(path: string): number {
    return path.split('/').filter((p) => p.length > 0).length;
  }

  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  private normalizePath(path: string): string {
    return path
      .split('/')
      .filter((p) => p.length > 0)
      .join('/');
  }

  validatePath(path: string): { valid: boolean; error?: string } {
    const normalizedPath = this.normalizePath(path);
    const depth = this.getDepth(normalizedPath);

    if (depth > this.maxDepth) {
      return {
        valid: false,
        error: `Path depth exceeds maximum allowed depth of ${this.maxDepth}`,
      };
    }

    return { valid: true };
  }

  validateExtension(filename: string): { valid: boolean; error?: string } {
    const extension = this.getExtension(filename);

    if (!extension) {
      return { valid: false, error: 'File must have an extension' };
    }

    if (!this.allowedExtensions.has(extension)) {
      return {
        valid: false,
        error: `Extension .${extension} is not allowed. Allowed: ${Array.from(this.allowedExtensions).join(', ')}`,
      };
    }

    return { valid: true };
  }

  addFile(metadata: FileMetadata): boolean {
    const pathValidation = this.validatePath(metadata.path);
    if (!pathValidation.valid) {
      throw new Error(pathValidation.error);
    }

    const extValidation = this.validateExtension(metadata.originalName);
    if (!extValidation.valid) {
      throw new Error(extValidation.error);
    }

    const key = `${metadata.productId}:${metadata.path}`;
    this.fileMap.set(key, metadata);
    return true;
  }

  getFile(productId: number, path: string): FileMetadata | undefined {
    const key = `${productId}:${this.normalizePath(path)}`;
    return this.fileMap.get(key);
  }

  deleteFile(productId: number, path: string): boolean {
    const key = `${productId}:${this.normalizePath(path)}`;
    return this.fileMap.delete(key);
  }

  getFilesByProduct(productId: number): FileMetadata[] {
    const files: FileMetadata[] = [];
    const prefix = `${productId}:`;

    for (const [key, value] of this.fileMap) {
      if (key.startsWith(prefix)) {
        files.push(value);
      }
    }

    return files;
  }

  buildTree(productId: number): FileNode {
    const files = this.getFilesByProduct(productId);
    const root: FileNode = {
      name: 'root',
      type: 'folder',
      path: '/',
      children: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    for (const file of files) {
      this.insertIntoTree(root, file);
    }

    return root;
  }

  private insertIntoTree(root: FileNode, metadata: FileMetadata): void {
    const pathParts = metadata.path.split('/').filter((p) => p.length > 0);
    let currentNode = root;

    // Navigate/create folders
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderName = pathParts[i];
      let folderNode = currentNode.children?.find(
        (child) => child.name === folderName && child.type === 'folder',
      );

      if (!folderNode) {
        folderNode = {
          name: folderName,
          type: 'folder',
          path: pathParts.slice(0, i + 1).join('/'),
          children: [],
          createdAt: metadata.createdAt,
          updatedAt: metadata.createdAt,
        };
        currentNode.children = currentNode.children || [];
        currentNode.children.push(folderNode);
      }

      currentNode = folderNode;
    }

    // Add file node với đầy đủ metadata
    const fileName = pathParts[pathParts.length - 1];
    const fileNode: FileNode = {
      name: fileName,
      type: 'file',
      path: metadata.path,
      extension: metadata.extension,
      size: metadata.size,
      originalName: metadata.originalName, // ← THÊM
      storedName: metadata.storedName, // ← THÊM
      mimeType: metadata.mimeType, // ← THÊM
      createdAt: metadata.createdAt,
      updatedAt: metadata.createdAt,
    };

    currentNode.children = currentNode.children || [];
    currentNode.children.push(fileNode);
  }

  deleteFolder(productId: number, folderPath: string): number {
    const normalizedPath = this.normalizePath(folderPath);
    const files = this.getFilesByProduct(productId);
    let deletedCount = 0;

    for (const file of files) {
      if (
        file.path.startsWith(normalizedPath + '/') ||
        file.path === normalizedPath
      ) {
        if (this.deleteFile(productId, file.path)) {
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  getStats(productId: number): {
    totalFiles: number;
    totalSize: number;
    filesByExtension: Record<string, number>;
    maxDepth: number;
  } {
    const files = this.getFilesByProduct(productId);
    const filesByExtension: Record<string, number> = {};
    let totalSize = 0;
    let maxDepth = 0;

    for (const file of files) {
      totalSize += file.size;
      filesByExtension[file.extension] =
        (filesByExtension[file.extension] || 0) + 1;
      const depth = this.getDepth(file.path);
      maxDepth = Math.max(maxDepth, depth);
    }

    return {
      totalFiles: files.length,
      totalSize,
      filesByExtension,
      maxDepth,
    };
  }

  clear(): void {
    this.fileMap.clear();
  }
}
