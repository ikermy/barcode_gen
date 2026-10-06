import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Корректное завершение по SIGTERM/SIGINT: вызов onModuleDestroy
  // (Prisma $disconnect, закрытие Kafka-продюсера).
  app.enableShutdownHooks();

  // Internal namespace исключён из глобального префикса: полный путь
  // /api/internal/v1/barcodes/* (не /api/v1/internal/...).
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'api/internal/v1/barcodes/(.*)', method: RequestMethod.ALL },
    ],
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // для Swagger static
    }),
  );
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Authorization'],
  });

  const NODE_ENV = process.env.NODE_ENV;
  if (NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Barcode API')
      .setDescription('Barcode endpoints')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
        },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        operationsSorter: (a: any, b: any) => {
          // 1) Make order a Record<string,number> so indexing by any string is allowed
          const order: Record<string, number> = {
            post: 1,
            patch: 2,
            delete: 3,
            get: 4,
          };

          // 2) Cast a.get('method') to string, then lowercase
          const methodA = (a.get('method') as string).toLowerCase();
          const methodB = (b.get('method') as string).toLowerCase();

          // 3) Now safe to index
          const rankA = order[methodA] ?? 99;
          const rankB = order[methodB] ?? 99;

          if (rankA < rankB) return -1;
          if (rankA > rankB) return 1;
          // fallback to path compare
          const pathA = a.get('path') as string;
          const pathB = b.get('path') as string;
          return pathA.localeCompare(pathB);
        },
      },
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        console.error(errors);
        return new BadRequestException(errors);
      },
    }),
  );

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
