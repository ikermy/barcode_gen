import { Test, TestingModule } from '@nestjs/testing';
import { BarcodeService } from './barcode.service';
import { PrismaService } from '../shared/services/prisma.service';
import { BarcodeConfigService } from '../barcode-config/barcode-config.service';
import { BillingService } from '../shared/services/billing.service';
import { RenderService } from '../render/render.service';

describe('BarcodeService', () => {
  let service: BarcodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarcodeService,
        { provide: PrismaService, useValue: {} },
        { provide: BarcodeConfigService, useValue: {} },
        { provide: BillingService, useValue: {} },
        { provide: RenderService, useValue: {} },
      ],
    }).compile();

    service = module.get<BarcodeService>(BarcodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
