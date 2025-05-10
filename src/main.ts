import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true, // CORS ni barcha uchun ochiq qilish
  });

  // Static fayllarni xizmat qilish
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  await app.listen(4000);
}
bootstrap();
