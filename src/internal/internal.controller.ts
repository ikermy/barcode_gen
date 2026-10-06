import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { BarcodeService } from '../barcode/barcode.service';
import { InternalCalculateDto } from './dto/internal-calculate.dto';
import { InternalCode128Dto } from './dto/internal-code128.dto';
import { InternalPdf417Dto } from './dto/internal-pdf417.dto';
import { InternalRandomDto } from './dto/internal-random.dto';
import { ServiceTokenGuard } from './service-token.guard';

// Аддитивный internal namespace для service-authenticated BFF.
// Публичные controller'ы и их guards не затрагиваются.
@ApiExcludeController()
@Controller('api/internal/v1/barcodes')
@UseGuards(ServiceTokenGuard)
export class InternalController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Post('random')
  random(@Body() dto: InternalRandomDto) {
    return this.barcodeService.internalRandom(dto);
  }

  @Post('calculate')
  calculate(@Body() dto: InternalCalculateDto) {
    return this.barcodeService.internalCalculate(dto);
  }

  @Post('pdf417')
  pdf417(@Body() dto: InternalPdf417Dto) {
    return this.barcodeService.internalPdf417(dto);
  }

  @Post('code128')
  code128(@Body() dto: InternalCode128Dto) {
    return this.barcodeService.internalCode128(dto);
  }

  // Render reconciliation (§B.1): terminal result либо PROCESSING/FAILED.
  @Get('renders/:renderKey')
  renderStatus(@Param('renderKey') renderKey: string) {
    return this.barcodeService.internalRenderStatus(renderKey);
  }
}
