import { ImageSize } from "./images.enums";  

export class GetImageBufferQuery {
  constructor(
    public readonly imageId: string,
    public readonly size?: ImageSize
  ) {}
} 