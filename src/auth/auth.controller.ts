import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './signup.dto';
import { LoginDto } from './login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ---------------- Sign Up ----------------
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.email, dto.password, dto.name);
  }

  // ---------------- Login ----------------
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // ---------------- Logout ----------------
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: any,
    @Body('refreshToken') refreshToken: string,
  ) {
    await this.authService.logout(user.userId, refreshToken);
    return { ok: true };
  }

  // ---------------- Refresh Tokens ----------------
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(@CurrentUser() user: any) {
    // The RefreshTokenStrategy already handled validation and rotation
    return user.tokens;
  }

  // ---------------- Protected Route Example ----------------
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    console.log('hit')
    return user;
  }

  @MessagePattern({ cmd: 'verify_token' })
  async verifyToken(@Payload() data: any) {
    console.log('Verifying token:', data.token);

    return this.authService.verifyToken(data.token);
  }
}
