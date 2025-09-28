import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AddressSuggestionDto } from './public.dadato.request.dtos';

@Injectable()
export class PublicDadataRoleService {
  private readonly apiToken: string;
  private readonly apiUrl: string = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('DADATA_API_TOKEN');
    if (!token) throw new Error('DADATA_API_TOKEN not found in environment variables');
    this.apiToken = token;
  }

  async suggestAddress(
    addressSuggestionDto: AddressSuggestionDto
  ): Promise<any> {
    try {
      const { query, city } = addressSuggestionDto;
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${this.apiToken}`
      };
      const body = {
        query: addressSuggestionDto.query,
        ...(city && { locations: [{ city }] }),
        restrict_value: true,
        from_bound: { value: "street" },
        to_bound:   { value: "house"  } 
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new HttpException(`DaData API returned status ${response.status}`, HttpStatus.BAD_GATEWAY);

      return await response.json();
    } catch (error) {
      throw new HttpException('Ошибка при получении подсказок адреса', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
