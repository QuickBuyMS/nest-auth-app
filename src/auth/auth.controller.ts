import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Get,
  Res,
  UseFilters,
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './signup.dto';
import { LoginDto } from './login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { MessagePattern, Payload } from '@nestjs/microservices';

// Cookie options for the refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Catch(UnauthorizedException)
export class ClearCookieOnUnauthorizedFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    });

    response.status(status).json(exception.getResponse());
  }
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  // ---------------- Sign Up ----------------
  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(dto.email, dto.password, dto.name);
    const tokens = result.data.tokens;

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    // Return only accessToken in the response body (never expose refresh token to JS)
    return {
      ...result,
      data: {
        ...result.data,
        tokens: { accessToken: tokens.accessToken },
      },
    };
  }

  // ---------------- Login ----------------
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password);
    const tokens = result.data.tokens;

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    // Return only accessToken in the response body
    return {
      ...result,
      data: {
        ...result.data,
        tokens: { accessToken: tokens.accessToken },
      },
    };
  }

  // ---------------- Logout ----------------
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: any,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Read the refresh token from the HttpOnly cookie
    const refreshToken = req.cookies?.['refreshToken'];
    const result = await this.authService.logout(user.userId, refreshToken);

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    });

    return result;
  }

  // ---------------- Refresh Tokens ----------------
  @UseGuards(AuthGuard('jwt-refresh'))
  @UseFilters(ClearCookieOnUnauthorizedFilter)
  @Post('refresh')
  async refresh(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // The RefreshTokenStrategy already validated and rotated tokens
    const tokens = user.tokens;

    // Set the new refresh token as HttpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    // Return only the new accessToken in the response body
    return { accessToken: tokens.accessToken };
  }

  // ---------------- Protected Route Example ----------------
  @UseGuards(JwtAuthGuard)
  @Get('myprofile')
  getProfile(@CurrentUser() user: any) {
    console.log('hit', user);
    return this.authService.getMyProfile(user.userId);
  }

  @MessagePattern({ cmd: 'verify_token' })
  async verifyToken(@Payload() data: any) {
    return this.authService.verifyToken(data.token);
  }
}
