import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

@Injectable()
export class CloudinaryService {
  async uploadFile(file: Express.Multer.File, folder = 'taraa'): Promise<CloudinaryUploadResult> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, res) => {
          if (error) return reject(error);
          resolve(res);
        },
      );
      Readable.from(file.buffer).pipe(upload);
    });

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }

  async uploadFromUrl(imageUrl: string, folder = 'taraa'): Promise<CloudinaryUploadResult> {
    const result = await cloudinary.uploader.upload(imageUrl, { folder, resource_type: 'image' });
    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  getOptimizedUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      fetch_format: 'auto', // f_auto: serve WebP/AVIF based on browser
      quality: 'auto',      // q_auto: optimal compression without visible loss
      secure: true,
    });
  }

  getThumbnailUrl(publicId: string, width = 300, height = 300): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      fetch_format: 'auto',
      quality: 'auto',
      secure: true,
    });
  }
}
