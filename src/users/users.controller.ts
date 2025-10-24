import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ---------------- Get current logged-in user ----------------
  @UseGuards(JwtAuthGuard)
  @Get('myprofile')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.userId);
  }

  // ---------------- Get a user by ID ----------------
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // ---------------- List all users (optional/admin) ----------------
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers() {
    // In production, restrict this to admins only
    return this.usersService.findAll();
  }
}
