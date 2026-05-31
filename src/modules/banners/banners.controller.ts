import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UploadedFile,
  UseGuards, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerType } from './schemas/banner.schema';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Public } from '../../decorators/public.decorator';
import { Role } from '../users/enums/role.enum';

const BANNERS_FOLDER = 'banners';

@ApiTags('Banners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('banners')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── Public ──────────────────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active banners (respects scheduling). Filter by type.' })
  @ApiQuery({ name: 'type', required: false, enum: BannerType, description: 'hero | promotional | sidebar' })
  findActive(@Query('type') type?: BannerType) {
    return this.bannersService.findActive(type);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a banner by ID' })
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  @Get('admin/all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all banners including inactive (admin only)' })
  @ApiQuery({ name: 'type', required: false, enum: BannerType })
  findAll(@Query('type') type?: BannerType) {
    return this.bannersService.findAll(type);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create banner with image upload (admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image:     { type: 'string', format: 'binary', description: 'Banner image file (≤ 5 MB)' },
        title:     { type: 'string' },
        subtitle:  { type: 'string' },
        link:      { type: 'string' },
        type:      { type: 'string', enum: Object.values(BannerType) },
        badge:     { type: 'string' },
        ctaText:   { type: 'string' },
        sortOrder: { type: 'number' },
        isActive:  { type: 'boolean' },
        startDate: { type: 'string', format: 'date-time' },
        endDate:   { type: 'string', format: 'date-time' },
      },
      required: ['title'],
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateBannerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file && !dto.image) {
      throw new BadRequestException('An image file (field: image) or an image URL is required');
    }

    let image = dto.image ?? '';
    let cloudinaryPublicId: string | undefined;

    if (file) {
      const uploaded = await this.cloudinaryService.uploadFile(file, BANNERS_FOLDER);
      image = uploaded.secureUrl;
      cloudinaryPublicId = uploaded.publicId;
    }

    return this.bannersService.create({
      ...dto,
      image,
      cloudinaryPublicId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate:   dto.endDate   ? new Date(dto.endDate)   : undefined,
    });
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update banner fields (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate:   dto.endDate   ? new Date(dto.endDate)   : undefined,
    });
  }

  @Patch(':id/image')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Replace banner image (admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async updateImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Image file is required (field: image)');

    const banner = await this.bannersService.findOne(id);

    // Delete old Cloudinary asset if it was uploaded via this API
    if (banner.cloudinaryPublicId) {
      await this.cloudinaryService.deleteFile(banner.cloudinaryPublicId).catch(() => null);
    }

    const uploaded = await this.cloudinaryService.uploadFile(file, BANNERS_FOLDER);
    return this.bannersService.update(id, {
      image: uploaded.secureUrl,
      cloudinaryPublicId: uploaded.publicId,
    });
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete banner and its Cloudinary image (admin only)' })
  async remove(@Param('id') id: string) {
    const { cloudinaryPublicId } = await this.bannersService.remove(id);
    if (cloudinaryPublicId) {
      await this.cloudinaryService.deleteFile(cloudinaryPublicId).catch(() => null);
    }
    return null;
  }
}
