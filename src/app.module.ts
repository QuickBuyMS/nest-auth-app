import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './db/database.module';
// import { PostgresProviderModule } from './db/postgres.provider';
import { ClientsModule } from '@nestjs/microservices';
import { getClientModuleConfig } from './config/messaging.config';


@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    // PostgresProviderModule,
    UsersModule,
    AuthModule,
    ClientsModule.register([getClientModuleConfig() as any]),
  ],
})
export class AppModule { }

