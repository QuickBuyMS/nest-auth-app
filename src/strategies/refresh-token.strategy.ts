import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';

/**
 * Custom extractor that reads the refresh token from an HttpOnly cookie.
 */
const cookieExtractor = (req: Request): string | null => {
  return req?.cookies?.['refreshToken'] || null;
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_TOKEN_SECRET,
      passReqToCallback: true, // pass the request so we can read the raw cookie
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req?.cookies?.['refreshToken'];
    const userId = payload.userId;

    if (!userId || !refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    try {
      // Ensure the refresh token is valid and still stored
      const tokens = await this.authService.refreshTokens(userId, refreshToken);
      // Return the user object; controller can then return new tokens
      return { userId: payload.userId, email: payload.email, tokens };
    } catch (err) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }
}
