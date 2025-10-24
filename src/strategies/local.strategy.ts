import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Tell Passport to use 'email' instead of 'username'
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.login(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Return user object to be attached to request
    return user.user;
  }
}
