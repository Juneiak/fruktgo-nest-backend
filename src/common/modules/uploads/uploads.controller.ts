import { Controller, Get, Param, Res, BadRequestException, NotFoundException, UseInterceptors, UploadedFile, Post, Body, Query } from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiParam, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { UploadsService } from "./uploads.service";
import { EntityType, ImageType } from "./uploaded-file.schema";


@ApiTags('images')
@Controller('images')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @ApiOperation({ summary: 'Получение изображения определенного размера' })
  @ApiParam({ 
    name: 'size', 
    enum: ['mobile', 'desktop'], 
    description: 'Размер изображения (mobile: 430px, desktop: 1440px)' 
  })
  @ApiParam({ name: 'imageId', description: 'ID изображения' })
  @Get(':size/:imageId')
  async getImage(
    @Param('size') size: 'mobile' | 'desktop',
    @Param('imageId') imageId: string,
    @Res() res: Response
  ) {
    try {
      // Валидация размера
      if (!['mobile', 'desktop'].includes(size)) throw new BadRequestException('Недопустимый размер изображения');
      const buffer = await this.uploadsService.getImageBuffer(imageId, size as 'mobile' | 'desktop');
      
      // Установка заголовков
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'max-age=31536000'); // Кэширование на 1 год
      
      res.end(buffer);
    } catch (error) {
      if (error instanceof NotFoundException) throw new NotFoundException(error.message);
      throw new BadRequestException('Ошибка при получении изображения');
    }
  }


  @ApiOperation({ summary: 'Получение всех изображений' })
  @Get('all')
  async getAllImages() {
    return this.uploadsService.getAllImages();
  }
}