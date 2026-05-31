import {
  Controller, Get, Post, Patch,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketStatus, TicketPriority, TicketCategory } from './schemas/ticket.schema';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Public } from '../../decorators/public.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ── Public / Customer ──────────────────────────────────────────────────────

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Submit a support ticket. Auth optional — guests must provide guestName + guestEmail.',
  })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user?: any) {
    return this.supportService.create(dto, user?.id, user?.name);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user\'s tickets' })
  @ApiQuery({ name: 'page',  required: false })
  @ApiQuery({ name: 'limit', required: false })
  getMyTickets(
    @CurrentUser() user: any,
    @Query('page')  page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.findMyTickets(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket by ID. Customers can only view their own.' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.supportService.findOne(id, user);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Add a reply to a ticket (customer or admin)' })
  reply(
    @Param('id')   id: string,
    @Body()        dto: ReplyTicketDto,
    @CurrentUser() user: any,
  ) {
    return this.supportService.addReply(id, dto.message, user);
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tickets with filters (admin only)' })
  @ApiQuery({ name: 'page',     required: false })
  @ApiQuery({ name: 'limit',    required: false })
  @ApiQuery({ name: 'status',   required: false, enum: TicketStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TicketPriority })
  @ApiQuery({ name: 'category', required: false, enum: TicketCategory })
  @ApiQuery({ name: 'search',   required: false, description: 'Search subject, ticket#, order#, email' })
  findAll(
    @Query('page')     page?: number,
    @Query('limit')    limit?: number,
    @Query('status')   status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('category') category?: TicketCategory,
    @Query('search')   search?: string,
  ) {
    return this.supportService.findAll({ page, limit, status, priority, category, search });
  }

  @Get('admin/stats')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ticket stats grouped by status, category and priority (admin only)' })
  getStats() {
    return this.supportService.getStats();
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update ticket status or priority (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.supportService.update(id, dto);
  }
}
