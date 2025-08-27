import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DadataService } from "./dadata.service";
import { AddressSuggestionDto } from "./address-suggestion.dto";

@Controller('dadata')
@ApiTags('dadata')
export class DadataController {
  constructor(private readonly dadataService: DadataService) {}

  @Post('suggest-address')
  @ApiOperation({ summary: 'Получение подсказок по адресам' })
  @ApiResponse({ 
    status: 200, 
    description: 'Возвращает список подсказок по адресам',
  })
  async suggestAddress(
    @Body() addressSuggestionDto: AddressSuggestionDto,
  ) {
    const result = await this.dadataService.suggestAddress(
      addressSuggestionDto.query, 
      addressSuggestionDto.city
    );
    return result;
  }
}
