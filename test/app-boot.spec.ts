import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Boot smoke test: proves the whole DI graph resolves, both surfaces mount at
 * their prefixes, and health responds. Uses an in-memory Mongo so it runs with
 * no external services.
 */
describe('App boot', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await mongod?.stop();
  });

  it('responds on /health', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect([200, 503]).toContain(res.status); // 200 healthy; 503 only if mongo ping fails
  });

  it('mounts the tenant auth login route under /api/v1', async () => {
    // Missing body → 400 from validation, proving the route exists (not 404).
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('mounts the platform auth login route under /platform/v1', async () => {
    const res = await request(app.getHttpServer()).post('/platform/v1/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('404s an unknown route', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope');
    expect(res.status).toBe(404);
  });
});
