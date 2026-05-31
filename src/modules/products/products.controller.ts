import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UploadedFiles,
  UseGuards, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkProductItemDto } from './dto/bulk-create-product.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Public } from '../../decorators/public.decorator';
import { Role } from '../users/enums/role.enum';

const PRODUCTS_FOLDER = 'products';
const MAX_BULK = 50;

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── Public endpoints ────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with optional filters & pagination' })
  @ApiQuery({ name: 'page',         required: false })
  @ApiQuery({ name: 'limit',        required: false })
  @ApiQuery({ name: 'category',     required: false })
  @ApiQuery({ name: 'search',       required: false })
  @ApiQuery({ name: 'inStock',      required: false })
  @ApiQuery({ name: 'isNew',        required: false })
  @ApiQuery({ name: 'isBestSeller', required: false })
  @ApiQuery({ name: 'sort',         required: false, description: 'price_asc | price_desc | popular | newest' })
  @ApiQuery({ name: 'exclude',      required: false, description: 'Product ID to exclude (for related products)' })
  findAll(
    @Query('page')         page?: number,
    @Query('limit')        limit?: number,
    @Query('category')     category?: string,
    @Query('search')       search?: string,
    @Query('inStock')      inStock?: boolean,
    @Query('isNew')        isNew?: boolean,
    @Query('isBestSeller') isBestSeller?: boolean,
    @Query('sort')         sort?: string,
    @Query('exclude')      exclude?: string,
  ) {
    return this.productsService.findAll({ page, limit, category, search, inStock, isNew, isBestSeller, sort, exclude });
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List all distinct categories' })
  getCategories() {
    return this.productsService.getCategories();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // ── Admin-only endpoints ────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create product with image upload — multipart/form-data (admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length && !dto.image) {
      throw new BadRequestException('At least one image file (field: images) or an image URL is required');
    }

    let image = dto.image ?? '';
    let cloudinaryPublicId: string | undefined;
    const extraImages: string[] = [];

    if (files?.length) {
      const uploads = await Promise.all(
        files.map(f => this.cloudinaryService.uploadFile(f, PRODUCTS_FOLDER)),
      );
      const [primary, ...rest] = uploads;
      image = primary.secureUrl;
      cloudinaryPublicId = primary.publicId;
      rest.forEach(r => extraImages.push(r.secureUrl));
    }

    return this.productsService.create({
      ...dto,
      image,
      cloudinaryPublicId,
      images: extraImages.length ? extraImages : (dto.images ?? []),
    });
  }

  // ── Bulk upload ─────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk create products with image uploads — multipart/form-data (admin only)',
    description: `
Send as **multipart/form-data** with two fields:

- **\`products\`** — JSON string array of product objects (matched to images by index)
- **\`images\`** — one or more image files (images[0] → products[0], images[1] → products[1], …)

Products without a matching image file must supply an **\`image\`** URL in their JSON object.

Max ${MAX_BULK} products per request. Individual failures don't abort the batch — check the \`failed\` array in the response.
    `.trim(),
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['products'],
      properties: {
        products: {
          type: 'string',
          description: 'JSON array of product objects',
          example: '[{"name":"Ring","category":"Rings","price":299,"originalPrice":499,"description":"..."}]',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Image files matched to products by index (up to 50)',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('images', MAX_BULK))
  async bulkCreate(
    @Body('products') productsJson: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // ── 1. Parse the JSON products field ──────────────────────────────────
    if (!productsJson) {
      throw new BadRequestException('Field "products" (JSON string array) is required');
    }

    let rawItems: unknown[];
    try {
      rawItems = JSON.parse(productsJson);
    } catch {
      throw new BadRequestException('Field "products" must be a valid JSON array string');
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new BadRequestException('Field "products" must be a non-empty JSON array');
    }

    if (rawItems.length > MAX_BULK) {
      throw new BadRequestException(`Maximum ${MAX_BULK} products per request`);
    }

    const fileList = files ?? [];

    // ── 2. Validate each item and upload its image ─────────────────────────
    const validationFailed: { index: number; name: string; error: string }[] = [];
    const readyItems: { index: number; data: Record<string, any> }[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      // Validate against DTO
      const dto = plainToInstance(BulkProductItemDto, rawItems[i]);
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });

      if (errors.length) {
        const messages = errors.flatMap(e => Object.values(e.constraints ?? {})).join('; ');
        validationFailed.push({ index: i, name: String((rawItems[i] as any).name ?? ''), error: messages });
        continue;
      }

      // Resolve image: prefer uploaded file at same index, fall back to dto.image URL
      const file = fileList[i];
      let image = dto.image ?? '';
      let cloudinaryPublicId: string | undefined;

      if (file) {
        try {
          const uploaded = await this.cloudinaryService.uploadFile(file, PRODUCTS_FOLDER);
          image = uploaded.secureUrl;
          cloudinaryPublicId = uploaded.publicId;
        } catch (err: any) {
          validationFailed.push({ index: i, name: dto.name, error: `Image upload failed: ${err?.message}` });
          continue;
        }
      }

      if (!image) {
        validationFailed.push({
          index: i,
          name: dto.name,
          error: 'No image file at this index and no "image" URL provided',
        });
        continue;
      }

      readyItems.push({
        index: i,
        data: { ...dto, image, cloudinaryPublicId, images: dto.images ?? [] },
      });
    }

    // ── 3. Bulk insert into MongoDB ────────────────────────────────────────
    const { created, failed: dbFailed } = await this.productsService.bulkCreate(
      readyItems.map(r => r.data),
    );

    // Re-map db failures back to original indices
    const remappedDbFailed = dbFailed.map(f => ({
      index: readyItems[f.index]?.index ?? f.index,
      name:  f.name,
      error: f.error,
    }));

    const allFailed = [...validationFailed, ...remappedDbFailed];

    return {
      summary: {
        total:   rawItems.length,
        created: created.length,
        failed:  allFailed.length,
      },
      created,
      failed: allFailed,
    };
  }

  // ── Add images to existing product ────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post(':id/images')
  @ApiOperation({ summary: 'Upload additional images to an existing product (admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async addImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length) throw new BadRequestException('No image files provided');

    const uploads = await Promise.all(
      files.map(f => this.cloudinaryService.uploadFile(f, PRODUCTS_FOLDER)),
    );

    const product = await this.productsService.findOne(id);
    const newUrls = uploads.map(u => u.secureUrl);

    return this.productsService.update(id, {
      images: [...(product.images ?? []), ...newUrls],
    } as any);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update product (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete product (admin only)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
