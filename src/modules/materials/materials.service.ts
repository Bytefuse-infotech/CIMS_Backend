import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MaterialType } from '@shared/enums';
import { Material, MaterialDocument } from './material.schema';
import { StorageService } from './storage.service';

export interface CreateMaterialInput {
  batchId: string;
  title: string;
  type: MaterialType;
  fileUrl: string;
  cdnUrl?: string;
  uploadedBy: string;
}

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name) private readonly model: Model<MaterialDocument>,
    private readonly storage: StorageService,
  ) {}

  list(batchId?: string): Promise<Material[]> {
    const q = batchId ? { batchId: new Types.ObjectId(batchId) } : {};
    return this.model.find(q).sort({ createdAt: -1 }).lean().exec();
  }

  create(input: CreateMaterialInput): Promise<Material> {
    return this.model.create({
      batchId: new Types.ObjectId(input.batchId),
      title: input.title,
      type: input.type,
      fileUrl: input.fileUrl,
      cdnUrl: input.cdnUrl,
      uploadedBy: new Types.ObjectId(input.uploadedBy),
    });
  }

  async remove(id: string): Promise<void> {
    const res = await this.model.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException('Material not found');
  }

  /**
   * Issue a signed upload URL via the storage seam. Real S3 presigning when CDN
   * is configured; deterministic stub otherwise. The client uploads directly to
   * `uploadUrl`, then POSTs the returned `fileKey`/`cdnUrl` back to create the
   * Material record.
   */
  createUploadUrl(filename: string) {
    return this.storage.createSignedUpload(filename, 'materials');
  }
}
