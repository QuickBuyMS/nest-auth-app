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
    await this.saveTokens(
      user.user_id,
      tokens.refreshToken,
      tokens.accessToken,
    );
    return { user, tokens };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.validatePassword(email, password);
    console.log('Validated User:', user);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.getTokens(user.user_id, user.email);

    console.log('Generated Tokens:', tokens);
    await this.saveTokens(
      user.user_id,
      tokens.refreshToken,
      tokens.accessToken,
    );

    return { user, tokens };
  }

  async logout(userId: string, refreshToken: string) {
    // const tokenHash = await this.hashToken(refreshToken);
    await this.db.query(
      'DELETE FROM tokens WHERE user_id=? AND refresh_token=?',
      [userId, refreshToken],
    );
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const [rows] = await this.db.query(
      'SELECT refresh_token FROM tokens WHERE user_id=?',
      [userId],
    );

    if (!rows || (Array.isArray(rows) && rows.length === 0))
      throw new UnauthorizedException('No refresh token found');

    for (const r of rows as any[]) {
      const match = await bcrypt.compare(refreshToken, r.refresh_token);
      if (match) {
        // Remove old token (rotation)
        await this.db.query(
          'DELETE FROM tokens WHERE user_id=? AND refresh_token=?',
          [userId, r.refresh_token],
        );

        const user = await this.usersService.findById(userId);
        const tokens = await this.getTokens(userId, user.email);
        await this.saveTokens(userId, tokens.refreshToken);
        return tokens;
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  async saveTokens(
    userId: string,
    refreshToken: string,
    accessToken?: string,
  ) {
    // const hashed = await this.hashToken(refreshToken);

    console.log('Saving tokens to DB:', { userId, refreshToken, accessToken });

    await this.db.query(
      'INSERT INTO tokens (user_id, refresh_token, access_token) VALUES (?, ?, ?)',
      [userId, refreshToken, accessToken || null],
    );
  }

  async getTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    let isUserLoggedin: any = await this.db.query(
      'SELECT * FROM tokens WHERE user_id=?',
      [userId],
    );

    // SINGLE SESSION LOGGED IN
    if (isUserLoggedin[0].length > 0) {
      await this.db.query('DELETE FROM tokens WHERE user_id=?', [userId]);
    }

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
    console.log(token)
    try {
      const isTokenPresent: any = await this.db.query(
        'SELECT * FROM tokens WHERE access_token=?',
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
