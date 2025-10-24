import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), // token comes from body
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_TOKEN_SECRET,
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    const refreshToken = payload.refreshToken;

    if (!userId || !refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    try {
      // Ensure the refresh token is valid and still stored
      const tokens = await this.authService.refreshTokens(userId, refreshToken);
      // Return the user object; controller can then return new tokens
      return { userId: payload.sub, email: payload.email, tokens };
    } catch (err) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }
}
