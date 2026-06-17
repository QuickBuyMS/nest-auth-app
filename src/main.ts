import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
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

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      port: 5001, // matches producer client settings
    },
  });

  await app.startAllMicroservices();
  console.log('AUTH microservice (TCP) listening on port 5001');

  const port = process.env.PORT || 7001;
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port}/api`);
}
bootstrap();
