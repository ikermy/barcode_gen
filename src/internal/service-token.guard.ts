import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

// Guard только для internal namespace. Проверяет BARCODEGEN_SERVICE_TOKEN
// константным по времени сравнением. Не используется публичными controller'ами.
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.BARCODEGEN_SERVICE_TOKEN;
    if (!expected) {
      throw new UnauthorizedException('service token is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.header('x-service-token');
    const bearer = request.header('authorization')?.replace(/^Bearer\s+/i, '');
    const provided = header ?? bearer;

    if (!provided || !ServiceTokenGuard.safeEqual(expected, provided)) {
      throw new UnauthorizedException('invalid service token');
    }
    return true;
  }

  private static safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Сравниваем равные по длине буферы, чтобы не раскрывать длину токена.
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
