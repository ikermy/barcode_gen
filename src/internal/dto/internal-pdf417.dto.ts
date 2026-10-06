import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

// Внутренний Engine DTO (только service-authenticated BFF).
// values — AAMVA-keyed; обязательны DAJ, DDB, QQQ (проверяется в сервисе).
export class InternalPdf417Dto {
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

  @ApiProperty({
    description: 'AAMVA-keyed values для рендера профиля',
    type: 'object',
    additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }] },
  })
  @IsObject()
  @IsNotEmptyObject()
  values!: Record<string, string | number>;

  @ApiPropertyOptional({
    description: 'Дополнительные jurisdiction inputs (резерв)',
    type: 'object',
    additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }] },
  })
  @IsOptional()
  @IsObject()
  jurisdictionInput?: Record<string, string | number>;
}
