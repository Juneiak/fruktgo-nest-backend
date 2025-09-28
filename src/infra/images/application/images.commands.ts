import { ImageAccessLevel, ImageEntityType, ImageType } from "../images.enums";
import { UserType } from "src/common/enums/common.enum";

//create log
export class UploadImageCommand {
  constructor(
    public readonly imageFile: Express.Multer.File, 
    public readonly accessLevel: ImageAccessLevel, 
    public readonly entityType?: ImageEntityType | null, 
    public readonly entityId?: string | null, 
    public readonly imageType?: ImageType | null, 
    public readonly allowedUsers?: { userId: string, role: string }[],
    public readonly 
  ) {}
}

export type UpdateImagePayload = {
  accessLevel?: ImageAccessLevel,
  entityType?: ImageEntityType | null,
  entityId?: string | null,
  imageType?: ImageType | null,
  allowedUsers?: { userId: string, role: string }[]
}

export class UpdateImageCommand {
  constructor(
    public readonly imageId: string,
    public readonly payload: UpdateImagePayload
  ) {}
}

export class DeleteImageCommand {
  constructor(

  ) {}
};


//delete all entity logs
export class DeleteAllEntityImagesCommand {
  constructor(

  ) {}
};
