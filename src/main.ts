import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { getMicroserviceConfig, getTransportType } from './config/messaging.config';
import * as cookieParser from 'cookie-parser';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Feature-flagged transport: TCP or RMQ
  const microserviceConfig = getMicroserviceConfig();
  app.connectMicroservice(microserviceConfig);

  await app.startAllMicroservices();
  const transportType = getTransportType();
  console.log(`AUTH microservice (${transportType}) started`);

  const port = process.env.PORT || 7001;
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port}/api`);
}
bootstrap();

