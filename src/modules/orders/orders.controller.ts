import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './schemas/order.schema';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Public } from '../../decorators/public.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Create order — guests can order too (no auth required)
  @Public()
  @Post()
  @ApiOperation({ summary: 'Place a new order' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: any) {
    return this.ordersService.create(dto, user?.id);
  }

  // Admin: list all orders
  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all orders (admin only)' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findAll({ page, limit, status });
  }

  // Customer: list own orders
  @Get('my')
  @ApiOperation({ summary: 'Get current user orders' })
  getMyOrders(@CurrentUser() user: any, @Query('page') page?: number) {
    return this.ordersService.findMyOrders(user.id, page);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateStatus(id, status, user);
  }
}
