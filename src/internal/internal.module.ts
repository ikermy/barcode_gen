import { Module } from '@nestjs/common';
import { BarcodeModule } from '../barcode/barcode.module';
import { InternalController } from './internal.controller';
import { ServiceTokenGuard } from './service-token.guard';

@Module({
  imports: [BarcodeModule],
  controllers: [InternalController],
  providers: [ServiceTokenGuard],
})
export class InternalModule {}
