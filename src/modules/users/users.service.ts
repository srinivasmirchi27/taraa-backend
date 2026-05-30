import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role } from './enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly model: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    if (data.email) {
      const existing = await this.model.findOne({ email: data.email });
      if (existing) throw new ConflictException('Email already registered');
    }
    if (data.phone) {
      const existing = await this.model.findOne({ phone: data.phone });
      if (existing) throw new ConflictException('Phone already registered');
    }
    return this.model.create(data);
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.model.findById(id).exec();
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email }).select('+password').exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.model.findOne({ phone }).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.model.findOne({ googleId }).exec();
  }

  // Find by googleId OR email — used to link accounts on first Google login
  async findForGoogleLogin(googleId: string, email: string): Promise<UserDocument | null> {
    return this.model.findOne({ $or: [{ googleId }, { email }] }).exec();
  }

  async update(id: string, data: Partial<User>): Promise<UserDocument> {
    const user = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`User ${id} not found`);
  }

  async setRole(id: string, role: Role): Promise<UserDocument> {
    return this.update(id, { role });
  }
}
