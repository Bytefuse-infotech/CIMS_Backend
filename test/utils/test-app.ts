import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../../src/app.module';

export interface TestContext {
  app: INestApplication;
  mongod: MongoMemoryServer;
}

/**
 * Boots the full AppModule against a fresh in-memory Mongo. Sets MONGO_URI
 * before compile so AppModule's forRootAsync factory picks it up.
 */
export async function bootTestApp(): Promise<TestContext> {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return { app, mongod };
}

export async function teardownTestApp(ctx: TestContext): Promise<void> {
  await ctx.app?.close();
  await ctx.mongod?.stop();
}
