import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MaterialType } from '@shared/enums';
import { Material, MaterialDocument } from './material.schema';

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
  constructor(@InjectModel(Material.name) private readonly model: Model<MaterialDocument>) {}

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
   * Issue a signed upload URL. Real CDN/object-storage signing is deferred; this
   * returns a stub key + url shape so the client flow (upload direct to storage,
   * then POST the returned key back) is testable end to end now.
   */
  createUploadUrl(filename: string): { uploadUrl: string; fileKey: string; cdnUrl: string } {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `materials/${safe}`;
    return {
      uploadUrl: `https://storage.stub.local/upload/${fileKey}?signature=stub`,
      fileKey,
      cdnUrl: `https://cdn.stub.local/${fileKey}`,
    };
  }
}
