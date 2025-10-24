import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private usersRepo: UsersRepository) {}

  async create(email: string, password: string, name: string) {
    const existing = await this.usersRepo.findByEmail(email);
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(password, 12);
    const user = await this.usersRepo.createUser(email, hashed, name);
    const createdUser = await this.usersRepo.findByEmail(email);
    if (!createdUser) throw new NotFoundException('User not found after creation');
    delete createdUser.password_hash;  
    console.log('Created User:', createdUser);
    return createdUser;
  }

  async validatePassword(email: string, plain: string) {
    const user = await this.usersRepo.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(plain, user.password_hash);
    if (!ok) return null;
    // hide password
    delete user.password_hash;
    return user;
  }

  async findById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    delete user.password_hash;
    return user;
  }

  async findAll() {
    const users = await this.usersRepo.getAllUser();
    if (!users) throw new NotFoundException('Users not found');
    return users;
  }
}
