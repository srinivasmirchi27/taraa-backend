import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Role } from './enums/role.enum';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all users (admin only)' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  updateMe(@CurrentUser() user: any, @Body() body: Partial<{ name: string; phone: string; address: string }>) {
    return this.usersService.update(user.id, body);
  }

  @Patch(':id/role')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign role to user (super admin only)' })
  setRole(@Param('id') id: string, @Body('role') role: Role) {
    return this.usersService.setRole(id, role);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete user (super admin only)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // ── Address management ────────────────────────────────────────────────────────

  @Post('me/addresses')
  @ApiOperation({ summary: 'Add a saved address' })
  addAddress(@CurrentUser() user: any, @Body() body: any) {
    return this.usersService.addAddress(user.id, body);
  }

  @Patch('me/addresses/:addressId')
  @ApiOperation({ summary: 'Update a saved address' })
  updateAddress(@CurrentUser() user: any, @Param('addressId') addressId: string, @Body() body: any) {
    return this.usersService.updateAddress(user.id, addressId, body);
  }

  @Delete('me/addresses/:addressId')
  @ApiOperation({ summary: 'Delete a saved address' })
  deleteAddress(@CurrentUser() user: any, @Param('addressId') addressId: string) {
    return this.usersService.deleteAddress(user.id, addressId);
  }

  @Patch('me/addresses/:addressId/default')
  @ApiOperation({ summary: 'Set an address as default' })
  setDefault(@CurrentUser() user: any, @Param('addressId') addressId: string) {
    return this.usersService.setDefaultAddress(user.id, addressId);
  }
}
