import { Module } from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { BarcodeController } from './barcode.controller';
import { SharedModule } from '../shared/shared.module';
import { BarcodeConfigModule } from '../barcode-config/barcode-config.module';
import { RenderModule } from '../render/render.module';

@Module({
  imports: [SharedModule, BarcodeConfigModule, RenderModule],
  providers: [BarcodeService],
  controllers: [BarcodeController],
  exports: [BarcodeService],
})
export class BarcodeModule {}
