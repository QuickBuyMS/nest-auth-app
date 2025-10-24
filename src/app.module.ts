import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './db/database.module';
// import { PostgresProviderModule } from './db/postgres.provider';
import { ClientsModule, Transport } from '@nestjs/microservices';


@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    // PostgresProviderModule,
    UsersModule,
    AuthModule,
    ClientsModule.register([
      {
        name: 'AUTH_MICROSERVICE',
        transport: Transport.TCP,
        options: { port: 5001 }, // microservice listens here
      },
    ]),
  ],
})
export class AppModule {}
