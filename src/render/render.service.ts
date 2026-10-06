import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';

interface RenderResponse {
  key: string;
  url: string;
}

type RenderConfig = Record<string, unknown>;

@Injectable()
export class RenderService {
  private readonly logger = new Logger(RenderService.name);
  private readonly http: AxiosInstance;
  private readonly maxConcurrency: number;
  private readonly maxQueue: number;
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor() {
    const url = process.env.RENDER_URL;
    if (!url) {
      throw new Error('RENDER_URL is not set in .env');
    }
    this.http = axios.create({
      baseURL: url,
      timeout: Number(process.env.RENDER_TIMEOUT ?? 30000),
    });
    this.maxConcurrency = Number(process.env.RENDER_MAX_CONCURRENCY ?? 4);
    this.maxQueue = Number(process.env.RENDER_QUEUE_SIZE ?? 0);
  }

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active += 1;
      return Promise.resolve();
    }
    if (this.queue.length >= this.maxQueue) {
      throw new HttpException(
        'Render service is overloaded, retry later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  private async post(body: Record<string, unknown>): Promise<RenderResponse> {
    await this.acquire();
    try {
      const response = await this.http.post<RenderResponse>('/render', body);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw new HttpException('Render service timeout', HttpStatus.GATEWAY_TIMEOUT);
        }
        if (status !== undefined && status >= 400 && status < 500) {
          throw new HttpException('Render request rejected', HttpStatus.BAD_REQUEST);
        }
        this.logger.error(`Render service error: ${error.message}`);
        throw new HttpException('Render service unavailable', HttpStatus.BAD_GATEWAY);
      }
      this.logger.error(`Unexpected render error: ${String(error)}`);
      throw new HttpException('Render service error', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      this.release();
    }
  }

  async renderPdf417(
    renderKey: string,
    payload: string,
    settings: RenderConfig,
  ): Promise<string> {
    const config = Object.entries(settings)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join('|');
    const { url } = await this.post({
      format: 'pdf417',
      payload,
      config,
      renderKey,
    });
    return url;
  }

  async renderCode128(renderKey: string, value: string): Promise<string> {
    const { url } = await this.post({
      format: 'code128',
      payload: value,
      renderKey,
    });
    return url;
  }
}
