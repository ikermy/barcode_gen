import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Внутренний Code128 render DTO (только service-authenticated BFF).
export class InternalCode128Dto {
  @ApiProperty({
    description: 'ownerId авторизованного пользователя BFF (Barcode.userId)',
  })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;

  @ApiPropertyOptional({
    description: 'Ключ/имя рендера; если не задан — генерируется UUID',
  })
  @IsOptional()
  @IsString()
  renderKey?: string;

  @ApiProperty({ description: 'Значение Code128', maxLength: 25 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  value!: string;
}
