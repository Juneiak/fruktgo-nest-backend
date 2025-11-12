import { ImageAccessLevel, ImageEntityType, ImageSize, ImageType } from "./images.enums";

export class UploadImageCommand {
  constructor(
    public readonly imageId: string,
    public readonly payload: {
      imageFile: Express.Multer.File,
      accessLevel: ImageAccessLevel;
      entityType?: ImageEntityType | null;
      entityId?: string | null;
      imageType?: ImageType | null;
      allowedUsers?: { userId: string; role: string }[];
      sizes?: ImageSize[];
    },
  ) {}
}


export class UpdateImageCommand {
  constructor(
    public readonly imageId: string,
    public readonly payload: {
      accessLevel?: ImageAccessLevel;
      entityType?: ImageEntityType | null;
      entityId?: string | null;
      imageType?: ImageType | null;
      allowedUsers?: { userId: string; role: string }[];
    }
  ) {}
}

export class DeleteImageCommand {
  constructor(
    public readonly imageId: string,
  ) {}
}

