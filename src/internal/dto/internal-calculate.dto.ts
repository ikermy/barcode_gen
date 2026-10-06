import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDefined,
  IsNotEmptyObject,
  IsObject,
  IsString,
} from 'class-validator';

// Внутренний DTO (только service-authenticated BFF).
export class InternalCalculateDto {
  @ApiProperty({
    description: 'AAMVA-keyed inputs',
    type: 'object',
    additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }] },
  })
  @IsDefined()
  @IsObject()
  @IsNotEmptyObject()
  input!: Record<string, string | number>;

  @ApiProperty({
    description: 'AAMVA-коды запрошенных outputs (DBA/DCK/DCF)',
    type: [String],
    example: ['DBA'],
  })
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  outputs!: string[];
}
