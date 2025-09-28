import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicDadataService } from "./public.dadata.role.service";
import { AddressSuggestionDto } from "./public.dadato.request.dtos";

@ApiTags('for public')
@Controller()
export class PublicDadataController {
  constructor(private readonly publicDadataService: PublicDadataService) {}

  @Post('suggest-address')
  @ApiOperation({ summary: 'Получение подсказок по адресам' })
  @ApiResponse({ 
    status: 200, 
    description: 'Возвращает список подсказок по адресам',
  })
  async suggestAddress(
    @Body() addressSuggestionDto: AddressSuggestionDto,
  ): Promise<any> {
    return await this.publicDadataService.suggestAddress(addressSuggestionDto);
  }
}
