import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`coaching-api listening on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`  tenant surface   → /api/v1`, 'Bootstrap');
  Logger.log(`  platform surface → /platform/v1`, 'Bootstrap');
  Logger.log(`  health           → /health`, 'Bootstrap');
}
void bootstrap();
