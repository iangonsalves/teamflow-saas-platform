import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

describe('TeamFlow API (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;

  beforeAll(async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '20';
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      rawBody: true,
    });
    configureApp(app, { enableSwagger: false });
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a healthy API response with security headers', async () => {
    const response = await request(httpServer).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      api: 'ok',
      database: 'ok',
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });

  it('registers a user and returns the authenticated user profile', async () => {
    const email = `e2e-auth-${Date.now()}@example.com`;
    const registerResponse = await request(httpServer)
      .post('/api/auth/register')
      .send({
        name: 'E2E Auth User',
        email,
        password: 'password123',
      })
      .expect(201);

    expect(registerResponse.body.user.email).toBe(email);
    expect(typeof registerResponse.body.accessToken).toBe('string');

    const meResponse = await request(httpServer)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .expect(200);

    expect(meResponse.body.user).toMatchObject({
      email,
      name: 'E2E Auth User',
    });
  });

  it('creates and lists workspaces for the authenticated user', async () => {
    const email = `e2e-workspace-${Date.now()}@example.com`;
    const registerResponse = await request(httpServer)
      .post('/api/auth/register')
      .send({
        name: 'Workspace Owner',
        email,
        password: 'password123',
      })
      .expect(201);

    const token = registerResponse.body.accessToken;

    const createWorkspaceResponse = await request(httpServer)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'E2E Workspace',
      })
      .expect(201);

    expect(createWorkspaceResponse.body).toMatchObject({
      name: 'E2E Workspace',
    });

    const listWorkspacesResponse = await request(httpServer)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listWorkspacesResponse.body)).toBe(true);
    expect(
      listWorkspacesResponse.body.some(
        (workspace: { id: string; name: string }) =>
          workspace.id === createWorkspaceResponse.body.id &&
          workspace.name === 'E2E Workspace',
      ),
    ).toBe(true);
  });
});
