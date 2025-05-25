import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { logger } from 'nestjs-i18n';
import { extname } from 'path';

/**
 * Custom decorator for upload file.
 * @param fieldName upload field (Ex: 'logo', 'banner' )
 * @param folder folder name (VD: 'apartments')
 */
export function UploadFiles(fields: { name: string; maxCount: number }[], folder: string) {
  return applyDecorators(
    UseInterceptors(
      FileFieldsInterceptor(fields, {
        storage: diskStorage({
          destination: `${process.env.STATIC_SERVE_DIR}/${folder}`,
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            callback(null, uniqueSuffix + extname(file.originalname));
          },
        }),
      }),
    ),
  );
}
