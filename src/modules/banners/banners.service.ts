import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument, BannerType } from './schemas/banner.schema';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name)
    private readonly model: Model<BannerDocument>,
  ) {}

  async create(data: Partial<Banner>): Promise<BannerDocument> {
    return this.model.create(data);
  }

  // Public listing — active only, respects scheduling, filtered by type
  async findActive(type?: BannerType): Promise<BannerDocument[]> {
    const now = new Date();
    const filter: Record<string, unknown> = {
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $gte: now } },
      ],
    };
    if (type) filter.type = type;
    return this.model.find(filter).sort({ sortOrder: 1, createdAt: -1 }).exec();
  }

  // Admin listing — all banners, optional type filter
  async findAll(type?: BannerType): Promise<BannerDocument[]> {
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    return this.model.find(filter).sort({ type: 1, sortOrder: 1, createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<BannerDocument> {
    const banner = await this.model.findById(id).exec();
    if (!banner) throw new NotFoundException(`Banner ${id} not found`);
    return banner;
  }

  async update(id: string, data: Partial<Banner>): Promise<BannerDocument> {
    const banner = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!banner) throw new NotFoundException(`Banner ${id} not found`);
    return banner;
  }

  async remove(id: string): Promise<{ cloudinaryPublicId: string | undefined }> {
    const banner = await this.model.findByIdAndDelete(id).exec();
    if (!banner) throw new NotFoundException(`Banner ${id} not found`);
    return { cloudinaryPublicId: banner.cloudinaryPublicId };
  }
}
