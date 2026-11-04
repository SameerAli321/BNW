import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // The host (SiteGround) puts nginx in front of the app. Trust that one proxy hop so req.ip is
  // the visitor's real IP — otherwise every user shares the proxy's IP and the rate limits
  // (login 10/min, API 100/min) are shared by the whole company.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());
  // API data is per-user and changes constantly — stop browsers and the host's proxy cache
  // (e.g. SiteGround's dynamic cache) from serving stale lists. Routes can still override this.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT) || 5000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`BNW OMS backend running on http://localhost:${port}/api/v1`);
}

bootstrap();
