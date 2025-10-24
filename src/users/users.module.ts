import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
// import { DATABASE_POOL } from '../db/database.module';


@Module({
providers: [UsersService, UsersRepository],
exports: [UsersService, UsersRepository],
})
export class UsersModule {}