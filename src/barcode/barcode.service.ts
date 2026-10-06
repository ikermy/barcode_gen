import { HttpException, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../shared/services/prisma.service';
import { BarcodeConfigService } from '../barcode-config/barcode-config.service';
import { fN } from '../shared/const/fields-names.const';
import { GetRandomDto } from './dto/get-random.dto';
import { Barcode, BarcodeType, Sex } from '../../generated/prisma';
import { GetCalculateDto } from './dto/get-calculate.dto';
import { GeneratePDF417Dto } from './dto/generate-pdf417.dto';
import { createHash, randomUUID } from 'crypto';
import { GenerateCode128Dto } from './dto/generate-code128.dto';
import { EditBarcodeDto } from './dto/edit-barcode.dto';
import { BillingService } from '../shared/services/billing.service';
import { RenderService } from '../render/render.service';
import { InternalRandomDto } from '../internal/dto/internal-random.dto';
import { InternalCalculateDto } from '../internal/dto/internal-calculate.dto';
import { InternalPdf417Dto } from '../internal/dto/internal-pdf417.dto';
import { InternalCode128Dto } from '../internal/dto/internal-code128.dto';
import { applyInternalDerivations } from './internal-derived';
import {
  validateInternalEngineValues,
  validateRenderFieldSet,
} from '../internal/engine-validation';

// Канонический JSON engine-значений (стабильный порядок ключей) для payload hash.
function canonicalEngineValues(values: Record<string, string>): string {
  return JSON.stringify(
    Object.keys(values || {})
      .filter((k) => values[k] !== undefined && values[k] !== null)
      .sort()
      .map((k) => [k, String(values[k])]),
  );
}

type RenderStatus = 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
type RenderRecord = {
  status: RenderStatus;
  payloadHash: string;
  id?: string;
  url?: string;
  errorCategory?: string;
};

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);
  // Internal render registry (§B.5): резервирует renderKey до encoder, хранит
  // payload hash и состояние. Терминальный результат также персистится в Prisma
  // (barcode.id = renderKey), поэтому replay переживает рестарт процесса.
  private readonly renderRegistry = new Map<string, RenderRecord>();
  constructor(
    private prisma: PrismaService,
    private configService: BarcodeConfigService,
    private billingService: BillingService,
    private renderService: RenderService,
  ) {}
  async getRandom(data: GetRandomDto): Promise<Record<string, string>> {
    try {
      const operation = data.output.join(',');
      if (operation === 'DAG,DAI,DAK') {
        const DAJ = data.input.DAJ;
        if (!DAJ || typeof DAJ !== 'string') {
          throw new HttpException(
            'DAJ is required for operation DAG,DAI,DAK and must be a string',
            400,
          );
        }
        const row = await this.getRandomAddressByState(DAJ);
        const result: Record<string, string> = {};

        for (const key of ['DAG', 'DAI', 'DAK'] as const) {
          const raw = row[key];
          result[fN[key]] = raw[0].toUpperCase() + raw.slice(1).toLowerCase();
        }
        return result;
      } else if (operation === 'DAC,DAD,DCS') {
        const DBC: Sex = data.input.DBC == 1 ? 'M' : 'F';
        if (!DBC || (DBC !== 'M' && DBC !== 'F')) {
          throw new HttpException(
            'DBC is required for operation DAC,DAD,DCS',
            400,
          );
        }
        const row: Record<string, string> = await this.getRandomUserBySex(DBC);
        const result: Record<string, string> = {};
        for (const key of ['DAC', 'DAD', 'DCS'] as const) {
          result[fN[key]] =
            row[key][0].toUpperCase() + row[key].slice(1).toLowerCase();
        }
        return result;
      } else if (operation === 'DBB') {
        const curDate: Date = new Date();
        let maxDays: Date = new Date(
          curDate.getFullYear() - 65,
          curDate.getMonth(),
          curDate.getDate(),
        );
        let minDays: Date = new Date(
          curDate.getFullYear() - 21,
          curDate.getMonth(),
          curDate.getDate(),
        );
        const a: Date = new Date(
          maxDays.getTime() +
            Math.random() * (minDays.getTime() - maxDays.getTime()),
        );
        let result: Record<string, string> = {
          [fN['DBB']]:
            `${String(a.getMonth() + 1).padStart(2, '0')}${String(a.getDate()).padStart(2, '0')}${a.getFullYear()}`,
        };
        return result;
      } else if (operation === 'DAQ') {
        const { dlNumberGeneration } = await import(
          './helper/dl-generation.helper'
        );
        const num = await dlNumberGeneration(data.input);
        const result: Record<string, string> = {};
        for (const key of data.output) {
          result[fN[key]] = num;
        }
        return result;
      } else if (operation === 'DBD,DBA') {
        const DAJ: string = data.input.DAJ as string;
        const DBB: string = data.input.DBB as string;
        const DDB: string = data.input.DDB as string;
        const DDA: string = data.input.DDA as string;
        if (!DAJ || !DBB || !DDB) {
          throw new HttpException(
            'DAJ, DBB, and DDB are required for operation DBD,DBA',
            400,
          );
        }
        // DDA читается helper'ом только для AZ/CO (F/N влияет на срок действия).
        if ((DAJ === 'AZ' || DAJ === 'CO') && !DDA) {
          throw new HttpException(
            'DDA is required for operation DBD,DBA in AZ/CO',
            400,
          );
        }
        const { dlIssueExpirationDates } = await import(
          './helper/dl-issue-expiration-dates.helper'
        );
        return await dlIssueExpirationDates(
          data.input as Record<string, string>,
        );
      } else if (operation === 'DCJ') {
        const { auditInfo } = await import('./helper/audit-info.helper');
        return await auditInfo(data.input as Record<string, string>);
      } else {
        throw new HttpException(`Unsupported operation: ${operation}`, 400);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Domain-ошибка семплирования даты (getRandomDate) — клиентская, не 500.
      if (error instanceof Error && error.message.startsWith('getRandomDate')) {
        throw new HttpException(error.message, 422);
      }
      throw new HttpException(
        'Internal server error in getting random data',
        500,
      );
    }
  }
  async getCalculate(data: GetCalculateDto): Promise<Record<string, string>> {
    try {
      const operation = data.output.join(',');

      if (operation === 'DBA') {
        const { DBD } = data.input as Record<string, string>;
        if (!DBD) {
          throw new HttpException('DBD are required for DBA', 400);
        }

        const { dlExpirationDateCalculation } = await import(
          './helper/dl-expiration-date-calculation.helper'
        );
        return await dlExpirationDateCalculation(data.input);
      }

      if (operation === 'DCK') {
        const { DBD, DAQ, DBA, DBB } = data.input as Record<string, string>;
        if (
          !DBD ||
          typeof DBD !== 'string' ||
          !DAQ ||
          typeof DAQ !== 'string' ||
          !DBA ||
          typeof DBA !== 'string' ||
          !DBB ||
          typeof DBB !== 'string'
        ) {
          throw new HttpException(
            'DBD, DAQ, DBA, DBB are required for DCK and must be strings',
            400,
          );
        }

        const { getInventoryNumber } = await import(
          './helper/get-inventory-number.dto'
        );
        return await getInventoryNumber(data.input as Record<string, string>);
      }
      if (operation === 'DCF') {
        const { getDDNumber } = await import('./helper/get-dd-number.helper');
        return await getDDNumber(data.input as Record<string, string>);
      }

      throw new HttpException(`Unsupported operation: ${operation}`, 400);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException('Internal server error in calculate', 500);
    }
  }

  // ─── Internal namespace (service-authenticated BFF) ───────────────────────
  // Возвращает AAMVA-keyed { values }, не human-readable labels. Billing/Kafka
  // не вызываются. Публичные DTO/поведение не меняются.

  private toAamvaValues(
    codes: string[],
    result: Record<string, string>,
  ): Record<string, string> {
    const values: Record<string, string> = {};
    for (const code of codes) {
      const value = result[code] ?? result[fN[code]];
      if (value === undefined || value === null || value === '') {
        throw new HttpException(`Internal adapter produced no value for ${code}`, 422);
      }
      values[code] = String(value);
    }
    return values;
  }

  async internalRandom(
    dto: InternalRandomDto,
  ): Promise<{ values: Record<string, string> }> {
    const publicDto = {
      input: dto.input,
      output: dto.outputs,
    } as GetRandomDto;
    const result = await this.getRandom(publicDto);
    return { values: this.toAamvaValues(dto.outputs, result) };
  }

  async internalCalculate(
    dto: InternalCalculateDto,
  ): Promise<{ values: Record<string, string> }> {
    const publicDto = {
      input: dto.input,
      output: dto.outputs,
    } as GetCalculateDto;
    const result = await this.getCalculate(publicDto);
    return { values: this.toAamvaValues(dto.outputs, result) };
  }

  async internalPdf417(
    dto: InternalPdf417Dto,
  ): Promise<{
    id: string;
    url: string;
    type: string;
    values: Record<string, string>;
  }> {
    try {
      const baseValues = Object.fromEntries(
        Object.entries(dto.values)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)]),
      ) as Record<string, string>;
      const values = applyInternalDerivations(baseValues);
      validateInternalEngineValues(values);

      const { DAJ, DDB } = values;
      const config = this.configService.findExactByStateAndRev(DAJ, DDB);
      if (!config) {
        throw new HttpException(
          `Unknown profile DAJ=${DAJ} DDB=${DDB}`,
          404,
        );
      }
      validateRenderFieldSet(values, config.renderFields);

      const renderKey = dto.renderKey ?? randomUUID();
      const payloadHash = createHash('sha256')
        .update(canonicalEngineValues(values))
        .digest('hex');

      // 1) In-flight/terminal состояние из registry (§B.5).
      const rec = this.renderRegistry.get(renderKey);
      if (rec) {
        if (rec.payloadHash !== payloadHash) {
          throw new HttpException('IDEMPOTENCY_CONFLICT', 409);
        }
        if (rec.status === 'SUCCEEDED') {
          return { id: rec.id!, url: rec.url!, type: 'PDF417', values };
        }
        if (rec.status === 'PROCESSING') {
          throw new HttpException('GENERATION_PENDING', 202);
        }
        throw new HttpException('Internal PDF417 render failed', 500);
      }

      // 2) Терминальный результат, переживший рестарт (barcode.id = renderKey).
      const existing = await this.prisma.barcode.findUnique({
        where: { id: renderKey },
      });
      if (existing) {
        let storedHash = '';
        try {
          storedHash = createHash('sha256')
            .update(
              canonicalEngineValues(
                JSON.parse(String(existing.data)) as Record<string, string>,
              ),
            )
            .digest('hex');
        } catch {
          storedHash = '';
        }
        if (storedHash && storedHash !== payloadHash) {
          throw new HttpException('IDEMPOTENCY_CONFLICT', 409);
        }
        this.renderRegistry.set(renderKey, {
          status: 'SUCCEEDED',
          payloadHash,
          id: existing.id,
          url: existing.url,
        });
        return { id: existing.id, url: existing.url, type: existing.type, values };
      }

      // 3) Резервируем и рендерим.
      this.renderRegistry.set(renderKey, { status: 'PROCESSING', payloadHash });
      try {
        const [payload, settings] = config.generate(values);
        const url = await this.renderService.renderPdf417(
          renderKey,
          payload,
          settings,
        );
        const barcode = await this.prisma.barcode.create({
          data: {
            id: renderKey,
            url,
            type: BarcodeType.PDF417,
            data: JSON.stringify(values),
            userId: dto.ownerId,
          },
        });
        this.renderRegistry.set(renderKey, {
          status: 'SUCCEEDED',
          payloadHash,
          id: barcode.id,
          url,
        });
        return { id: barcode.id, url, type: barcode.type, values };
      } catch (renderErr) {
        this.renderRegistry.set(renderKey, {
          status: 'FAILED',
          payloadHash,
          errorCategory:
            renderErr instanceof HttpException ? 'VALIDATION' : 'RENDER',
        });
        throw renderErr;
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error in internal PDF417 render', error);
      throw new HttpException('Internal PDF417 render failed', 500);
    }
  }

  // Render reconciliation (§B.1): терминальный результат либо PROCESSING/FAILED.
  async internalRenderStatus(renderKey: string): Promise<{
    id?: string;
    url?: string;
    type?: string;
    status: RenderStatus;
    errorCategory?: string;
  }> {
    const rec = this.renderRegistry.get(renderKey);
    if (rec) {
      if (rec.status === 'SUCCEEDED') {
        return { id: rec.id, url: rec.url, type: 'PDF417', status: 'SUCCEEDED' };
      }
      if (rec.status === 'FAILED') {
        return { status: 'FAILED', errorCategory: rec.errorCategory };
      }
      return { status: 'PROCESSING' };
    }
    const existing = await this.prisma.barcode.findUnique({
      where: { id: renderKey },
    });
    if (existing) {
      return {
        id: existing.id,
        url: existing.url,
        type: existing.type,
        status: 'SUCCEEDED',
      };
    }
    throw new HttpException('RENDER_NOT_FOUND', 404);
  }

  async internalCode128(
    dto: InternalCode128Dto,
  ): Promise<{ id: string; url: string; type: string; value: string }> {
    try {
      const id = dto.renderKey ?? randomUUID();

      const existing = await this.prisma.barcode.findUnique({ where: { id } });
      if (existing) {
        return {
          id: existing.id,
          url: existing.url,
          type: existing.type,
          value: dto.value,
        };
      }

      const url = await this.renderService.renderCode128(id, dto.value);

      const barcode = await this.prisma.barcode.create({
        data: {
          id,
          url,
          type: BarcodeType.CODE128,
          data: JSON.stringify({ inventory: dto.value }),
          userId: dto.ownerId,
        },
      });

      return { id: barcode.id, url, type: barcode.type, value: dto.value };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error in internal Code128 render', error);
      throw new HttpException('Internal Code128 render failed', 500);
    }
  }

  async generatePdf417(data: GeneratePDF417Dto): Promise<Barcode> {
    try {
      const canBuy = await this.billingService.canBuy(data.token);
      if (!canBuy) {
        throw new HttpException('Insufficient credits', 400);
      }
      const config = await this.configService.findByStateAndRev(
        data.values.DAJ,
        data.values.DDB,
      );

      const values = Object.fromEntries(
        Object.entries(data.values)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)]),
      ) as Record<string, string>;

      const id = randomUUID();
      const [payload, settings] = config.generate(values);

      const url = await this.renderService.renderPdf417(id, payload, settings);

      const barcode = await this.prisma.barcode.create({
        data: {
          id: id,
          url: url,
          type: BarcodeType.PDF417,
          data: JSON.stringify(values),
          userId: data.userId,
        },
      });

      return barcode;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error generating PDF417 barcode', error);
      throw new HttpException(
        'Internal server error in PDF417 generation',
        500,
      );
    }
  }
  async generateCode128(data: GenerateCode128Dto): Promise<Barcode> {
    try {
      const canBuy = await this.billingService.canBuy(data.token);
      if (!canBuy) {
        throw new HttpException('Insufficient credits', 400);
      }
      const id = randomUUID();
      const url = await this.renderService.renderCode128(id, data.value);

      const barcode = await this.prisma.barcode.create({
        data: {
          id: id,
          url: url,
          type: BarcodeType.CODE128,
          data: JSON.stringify({ inventory: data.value }),
          userId: data.userId,
        },
      });

      return barcode;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error generating CODE128 barcode', error);
      throw new HttpException(
        'Internal server error in CODE128 generation',
        500,
      );
    }
  }
  async editBarcode(id: string, data: EditBarcodeDto): Promise<Barcode> {
    try {
      const instance = await this.prisma.barcode.findUnique({
        where: { id: id },
      });
      if (!instance) {
        throw new HttpException(`Barcode with id ${id} not found`, 404);
      }
      if (instance.userId !== data.userId) {
        throw new HttpException(
          `You are not allowed to edit this barcode`,
          403,
        );
      }
      if (instance.editFlag) {
        throw new HttpException(`Barcode can be edited only once`, 400);
      }
      const newId = randomUUID();
      if (data.type === BarcodeType.PDF417) {
        const config = await this.configService.findByStateAndRev(
          data.values?.DAJ,
          data.values?.DDB,
        );

        const values = Object.fromEntries(
          Object.entries(data.values)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        ) as Record<string, string>;

        const [payload, settings] = config.generate(values);

        const url = await this.renderService.renderPdf417(
          newId,
          payload,
          settings,
        );

        const barcode = await this.prisma.barcode.update({
          where: { id: id },
          data: {
            url: url,
            data: JSON.stringify(values),
            userId: data.userId,
            editFlag: true,
          },
        });
        return barcode;
      } else {
        if (!data.values.DCK) {
          throw new HttpException('DCK is required for CODE128', 400);
        }
        const url = await this.renderService.renderCode128(
          newId,
          data.values.DCK,
        );

        const barcode = await this.prisma.barcode.update({
          where: { id: id },
          data: {
            url: url,
            data: JSON.stringify({ inventory: data.values.DCK }),
            userId: data.userId,
            editFlag: true,
          },
        });
        return barcode;
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error editing barcode with id ${id}`, error);
      throw new HttpException(
        `Internal server error in editing barcode with id ${id}`,
        500,
      );
    }
  }
  async getRandomAddressByState(
    state: string,
  ): Promise<{ DAG: string; DAI: string; DAK: string }> {
    const total = await this.prisma.address.count({ where: { DAJ: state } });
    if (total === 0) {
      throw new HttpException(`No addresses for state=${state}`, 404);
    }
    const skip = Math.floor(Math.random() * total);

    const rows = await this.prisma.address.findMany({
      where: { DAJ: state },
      select: { DAG: true, DAI: true, DAK: true },
      orderBy: { id: 'asc' },
      skip,
      take: 1,
    });

    return rows[0]!;
  }
  async getRandomUserBySex(
    sex: Sex,
  ): Promise<{ DAC: string; DAD: string; DCS: string }> {
    const total = await this.prisma.names.count({ where: { DBC: sex } });
    if (total === 0) {
      throw new HttpException(`No names for sex=${sex}`, 400);
    }

    const pickDAC = (async () => {
      const skip = Math.floor(Math.random() * total);
      const [row] = await this.prisma.names.findMany({
        where: { DBC: sex },
        select: { DAC: true },
        orderBy: { id: 'asc' },
        skip,
        take: 1,
      });
      return row!.DAC;
    })();

    const pickDAD = (async () => {
      const skip = Math.floor(Math.random() * total);
      const [row] = await this.prisma.names.findMany({
        where: { DBC: sex },
        select: { DAD: true },
        orderBy: { id: 'asc' },
        skip,
        take: 1,
      });
      return row!.DAD;
    })();

    const pickDCS = (async () => {
      const skip = Math.floor(Math.random() * total);
      const [row] = await this.prisma.names.findMany({
        where: { DBC: sex },
        select: { DCS: true },
        orderBy: { id: 'asc' },
        skip,
        take: 1,
      });
      return row!.DCS;
    })();

    const [DAC, DAD, DCS] = await Promise.all([pickDAC, pickDAD, pickDCS]);
    return { DAC, DAD, DCS };
  }
}
