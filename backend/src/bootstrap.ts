import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';

type ConfigureAppOptions = {
  enableSwagger?: boolean;
};

export function configureApp(
  app: INestApplication,
  options: ConfigureAppOptions = {},
) {
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const expressApp = app.getHttpAdapter().getInstance?.();
  if (typeof expressApp?.disable === 'function') {
    expressApp.disable('x-powered-by');
    // Local avatar uploads are served directly by the API during development.
    const uploadsPath = join(process.cwd(), 'uploads');
    const avatarUploadsPath = join(uploadsPath, 'avatars');
    mkdirSync(uploadsPath, { recursive: true });
    mkdirSync(avatarUploadsPath, { recursive: true });
    expressApp.use('/uploads', express.static(uploadsPath));
  }

  app.use((request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    if (process.env.NODE_ENV === 'production' && request.secure) {
      response.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  });

  if (options.enableSwagger !== false) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TeamFlow API')
      .setDescription('API documentation for the TeamFlow SaaS platform.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }
}
