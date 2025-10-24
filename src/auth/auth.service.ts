import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Pool } from 'mysql2/promise';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
  ) {}

  async signup(email: string, password: string, name: string) {
    const user = await this.usersService.create(email, password, name);
    console.log(user);
    const tokens = await this.getTokens(user.user_id, user.email);
    await this.saveRefreshToken(user.user_id, tokens.refreshToken);
    return { user, tokens };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.validatePassword(email, password);
    console.log('Validated User:', user);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.getTokens(user.user_id, user.email);
    await this.saveRefreshToken(user.user_id, tokens.refreshToken);

    return { user, tokens };
  }

  async logout(userId: string, refreshToken: string) {
    // const tokenHash = await this.hashToken(refreshToken);
    await this.db.query(
      'DELETE FROM refresh_tokens WHERE user_id=? AND token_hash=?',
      [userId, refreshToken],
    );
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const [rows] = await this.db.query(
      'SELECT token_hash FROM refresh_tokens WHERE user_id=?',
      [userId],
    );

    if (!rows || (Array.isArray(rows) && rows.length === 0))
      throw new UnauthorizedException('No refresh token found');

    for (const r of rows as any[]) {
      const match = await bcrypt.compare(refreshToken, r.token_hash);
      if (match) {
        // Remove old token (rotation)
        await this.db.query(
          'DELETE FROM refresh_tokens WHERE user_id=? AND token_hash=?',
          [userId, r.token_hash],
        );

        const user = await this.usersService.findById(userId);
        const tokens = await this.getTokens(userId, user.email);
        await this.saveRefreshToken(userId, tokens.refreshToken);
        return tokens;
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    // const hashed = await this.hashToken(refreshToken);
    await this.db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash) VALUES (?, ?)',
      [userId, refreshToken],
    );
  }

  private async hashToken(token: string) {
    return bcrypt.hash(token, 12);
  }

  private async getTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION ?? '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_TOKEN_SECRET,
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION ?? '7d',
    });
    return { accessToken, refreshToken };
  }

  async verifyToken(token: string) {
    try {
      const isTokenPresent: any = await this.db.query(
        'SELECT token_hash FROM refresh_tokens WHERE token_hash=?',
        [token],
      );

      if (isTokenPresent[0].length === 0) {
        return { valid: false, error: 'Token not found in database' };
      }

      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      });
      return { valid: true, decoded };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }
}
