import { HttpException, HttpStatus } from '@nestjs/common';

export class FieldErrorException extends HttpException {
  constructor(fieldError: string, message: string) {
    super({ fieldError, message }, HttpStatus.CONFLICT);
  }
}
