import { Inject } from '@nestjs/common';
import { Pool } from 'mysql2/promise';

export type UserRow = {
  user_id: string;
  email: string;
  password_hash: string;
  created_at: Date;
};

export class UsersRepository {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  async createUser(email: string, hashedPassword: string, name: string) {
    const sql = 'INSERT INTO users (email, password_hash, name) VALUES (?,?,?)';
    const [rows] = await this.db.query(sql, [email, hashedPassword, name]);
    return (rows as any[])[0] as Partial<UserRow>;
  }

  async findByEmail(email: string) {
    const [rows] = await this.db.query(
      'SELECT user_id, email, password_hash, created_at FROM users WHERE email=?',
      [email],
    );
    return (rows as UserRow[])[0] as UserRow | undefined;
  }

  async findById(id: string) {
    const [rows] = await this.db.query(
      'SELECT user_id, email, password_hash, created_at FROM users WHERE user_id=?',
      [id],
    );
    return (rows as UserRow[])[0] as UserRow | undefined;
  }

  async getAllUser() {
    const [rows] = await this.db.query('SELECT * FROM users');
    return (rows as UserRow[])[0] as UserRow | undefined;
  }
}
