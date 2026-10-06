import { Test, TestingModule } from '@nestjs/testing';
import { BarcodeController } from './barcode.controller';
import { BarcodeService } from './barcode.service';
import { BarcodeConfigService } from '../barcode-config/barcode-config.service';
import { KafkaService } from '../shared/services/kafka.service';

describe('BarcodeController', () => {
  let controller: BarcodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarcodeController],
      providers: [
        { provide: BarcodeService, useValue: {} },
        { provide: BarcodeConfigService, useValue: {} },
        { provide: KafkaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<BarcodeController>(BarcodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
