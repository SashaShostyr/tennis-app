import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  // Coach keyframes are base64 JPEGs — raise the body limit above the 100 kb default.
  app.useBodyParser('json', { limit: '12mb' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true, // turn payloads into DTO instances
    }),
  );

  app.enableCors({
    origin: config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173',
    credentials: true,
  });

  // Same-origin production: serve the built SPA for everything that isn't /api.
  // Guarded by existsSync so local dev (no build present) is untouched — Vite
  // serves the SPA there. webDist resolves to apps/web/dist relative to dist/main.js.
  const webDist = config.get<string>('WEB_DIST') ?? join(__dirname, '..', '..', 'web', 'dist');
  if (existsSync(webDist)) {
    app.useStaticAssets(webDist);
    app
      .getHttpAdapter()
      .getInstance()
      .get(/^\/(?!api).*/, (_req: unknown, res: { sendFile: (p: string) => void }) =>
        res.sendFile(join(webDist, 'index.html')),
      );
    // eslint-disable-next-line no-console
    console.log(`Serving web app from ${webDist}`);
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}/api`);
}

bootstrap();
