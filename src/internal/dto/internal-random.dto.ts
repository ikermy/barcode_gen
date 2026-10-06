import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDefined,
  IsNotEmptyObject,
  IsObject,
  IsString,
} from 'class-validator';

// Внутренний DTO (только service-authenticated BFF). Намеренно без строгого
// output-set constraint публичного GetRandomDto.
export class InternalRandomDto {
  @ApiProperty({
    description: 'AAMVA-keyed inputs (например DAJ, DBC)',
    type: 'object',
    additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }] },
  })
  @IsDefined()
  @IsObject()
  @IsNotEmptyObject()
  input!: Record<string, string | number>;

  @ApiProperty({
    description: 'AAMVA-коды запрошенных outputs',
    type: [String],
    example: ['DAG', 'DAI', 'DAK'],
  })
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  outputs!: string[];
}
