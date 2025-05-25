import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { DatabaseErrorCode } from '../common/constants/database-error';

export function handleDatabaseError(error: any) {
  if (error instanceof QueryFailedError) {
    const driverError = error.driverError as { detail?: string };
    const details = driverError?.detail;
    const match = details?.match(/\(([^)]+)\)=\(([^)]+)\)/);
    console.log(match);
    const fieldName = match?.[1] || 'Unknown field';
    const fieldValue = match?.[2] || 'Unknow value';
    switch (error.driverError?.code) {
      case DatabaseErrorCode.UNIQUE_VIOLATION:
        throw new ConflictException({
          message: [
            {
              field: fieldName,
              value: fieldValue,
              message: `The value for '${fieldName}' already exists.`,
            },
          ],
        });

      case DatabaseErrorCode.FOREIGN_KEY_VIOLATION:
        // Change ConflictException to NotFoundException
        throw new NotFoundException({
          message: [
            {
              field: fieldName,
              message: `Referenced '${fieldName}' not found, possibly due to a foreign key constraint violation.`,
            },
          ],
        });

      case DatabaseErrorCode.COLUMN_MISSING: // Lỗi column không tồn tại
        throw new BadRequestException({
          message: [
            {
              field: fieldName,
              message: `Invalid column in query: ${error.driverError?.message}`,
            },
          ],
        });

      default:
        break;
    }
  }
}
