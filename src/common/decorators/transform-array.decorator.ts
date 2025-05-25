import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';

export function TransformJsonArray<T extends object>(cls: new () => T) {
  return Transform(({ value }) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(parsed)) {
        throw new BadRequestException('Value must be an array');
      }
      return parsed.map((item) => Object.assign(new cls(), item));
    } catch (e) {
      throw new BadRequestException('Invalid JSON or format: ' + e.message);
    }
  });
}
