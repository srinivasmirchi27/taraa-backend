import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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

  // ── Public: place order (guest + auth) ─────────────────────────────────────
  @Public()
  @Post()
  @ApiOperation({ summary: 'Place a new order (COD or Razorpay)' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: any) {
    return this.ordersService.create(dto, user?.id);
  }

  // ── Public: guest order tracking ───────────────────────────────────────────
  @Public()
  @Get('track')
  @ApiOperation({ summary: 'Track an order by order number + email (no auth required)' })
  @ApiQuery({ name: 'orderNumber', required: true, example: 'TRA20250531001' })
  @ApiQuery({ name: 'email',       required: true, example: 'user@example.com' })
  track(
    @Query('orderNumber') orderNumber: string,
    @Query('email')       email: string,
  ) {
    if (!orderNumber || !email) {
      throw new Error('orderNumber and email are required');
    }
    return this.ordersService.track(orderNumber, email);
  }

  // ── Customer: my orders ─────────────────────────────────────────────────────
  @Get('my')
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiQuery({ name: 'page',  required: false })
  @ApiQuery({ name: 'limit', required: false })
  getMyOrders(
    @CurrentUser() user: any,
    @Query('page')  page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findMyOrders(user.id, page, limit);
  }

  // ── Admin: list all orders ──────────────────────────────────────────────────
  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all orders (admin only)' })
  @ApiQuery({ name: 'page',   required: false })
  @ApiQuery({ name: 'limit',  required: false })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  findAll(
    @Query('page')   page?: number,
    @Query('limit')  limit?: number,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findAll({ page, limit, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id')      id: string,
    @Body('status')   status: OrderStatus,
    @CurrentUser()    user: any,
  ) {
    return this.ordersService.updateStatus(id, status, user);
  }
}
