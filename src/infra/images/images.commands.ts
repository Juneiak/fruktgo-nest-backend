import { ImageAccessLevel, ImageEntityType, ImageSize, ImageType } from "./images.enums";

export type UploadImagePayload = {
  imageId?: string;
  accessLevel: ImageAccessLevel;
  entityType?: ImageEntityType | null;
  entityId?: string | null;
  imageType?: ImageType | null;
  allowedUsers?: { userId: string; role: string }[];
  sizes?: ImageSize[];
}

export class UploadImageCommand {
  constructor(
    public readonly imageFile: Express.Multer.File,
    public readonly payload: UploadImagePayload,
  ) {}
}

export type UpdateImagePayload = {
  accessLevel?: ImageAccessLevel;
  entityType?: ImageEntityType | null;
  entityId?: string | null;
  imageType?: ImageType | null;
  allowedUsers?: { userId: string; role: string }[];
}

export class UpdateImageCommand {
  constructor(
    public readonly imageId: string,
    public readonly payload: UpdateImagePayload
  ) {}
}

