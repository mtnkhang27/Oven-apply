import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsPositive,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

import { Environment } from '../enums/environment.enum';

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsPositive()
  @IsNotEmpty()
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsPositive()
  @IsNotEmpty()
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASS: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsPositive()
  @IsNotEmpty()
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  REDIS_USERNAME: string;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string;

  @IsPositive()
  @IsNotEmpty()
  REDIS_DATABASE: number;

  @IsString()
  @IsNotEmpty()
  REDIS_KEY_PREFIX: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsNotEmpty()
  @IsPositive()
  JWT_ACCESS_TOKEN_TTL: number;

  @IsString()
  @IsNotEmpty()
  SWAGGER_SITE_TITLE: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_DOC_TITLE: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_DOC_DESCRIPTION: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_DOC_VERSION: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessage = errors
      .map((message) => {
        if (!message.constraints) return ''; // Handle undefined case
        const firstConstraintKey = Object.keys(message.constraints)[0];
        return message.constraints[firstConstraintKey];
      })
      .filter(Boolean) // Remove empty messages
      .join('\n');

    const COLOR = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      fgRed: '\x1b[31m',
    };

    const formattedMessage = `${COLOR.fgRed}${COLOR.bright}${errorMessage}${COLOR.reset}`;

    throw new Error(formattedMessage);
  }

  return validatedConfig;
}
