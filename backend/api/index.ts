import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import express from 'express';

const server = express();

export const createExpressServer = async (expressInstance: any) => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressInstance));
  app.enableCors();
  app.setGlobalPrefix('api/v1');
  await app.init();
  return app;
};

createExpressServer(server);

export default server;
