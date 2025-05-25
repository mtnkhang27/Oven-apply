import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  logger.log('NODE_ENV:', process.env.NODE_ENV);
  logger.log('DB_NAME:', process.env.DB_NAME);

  app.enableCors({
    origin: [
      'http://localhost:2704',
      'https://dev.ql.sgtl.tikera.net',
      'https://ql.sgtl.tikera.net',
      'http://localhost:8089',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization, x-lang',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        if (errors?.length > 0) {
          const formattedErrors = errors.map((error) => ({
            field: error.property,
            error: error.constraints
              ? Object.values(error.constraints).join(', ')
              : 'Format error, please check the format',
          }));

          return new BadRequestException({
            statusCode: 400,
            message: formattedErrors,
            error: 'BadRequestException',
          });
        }
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_SITE_TITLE || 'Tikera API docs')
    .setDescription(process.env.SWAGGER_DOC_DESCRIPTION || 'SGTL Project')
    .setVersion(process.env.SWAGGER_DOC_VERSION || '1.0')
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      required: true,
      name: 'x-lang',
      schema: {
        example: 'vi_VN',
      },
    })
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory, {
    swaggerOptions: {
      supportedSubmitMethods: ['get', 'post', 'patch', 'delete'],
      showRequestDuration: true,
      docExpansion: 'none',
      displayRequestDuration: true,
      download: true, // Kích hoạt nút tải xuống
      requestInterceptor: (req) => {
        req.headers['x-lang'] = req.headers['x-lang'] || 'vi_VN'; // Default language
        return req;
      },
    },
  });

  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
  });

  app.use((req, res, next) => {
    logger.log(`[${req.method}] ${req.url}`);
    next();
  });
  let port;
  if (process.env.NODE_ENV == 'development') {
    port = process.env.DEV_PORT;
  } else if (process.env.NODE_ENV == 'production') {
    console.log = function () {};
    port = process.env.PROD_PORT;
  } else {
    port = process.env.LOCAL_PORT;
  }
  await app.listen(port);
  logger.log(`🚀 Server is running on http://localhost:${port}`);

  // await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
