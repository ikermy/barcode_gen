import { HttpException, HttpStatus } from '@nestjs/common';
import {
  DCJ_REQUIRED_STATES,
  DDB_DIGITS,
  DDB_MICHIGAN,
  ENGINE_KEY_PATTERN,
  type EngineValues,
  KNOWN_ENGINE_KEYS,
} from './dto/engine-values.dto';

// Строгая валидация internal Engine DTO: только AAMVA-ключи, обязательные
// DAJ/DDB/QQQ, формат DDB, profile-specific требования.
// Публичные field names и прочие ключи запрещены форматом ключа.
export function validateInternalEngineValues(values: EngineValues): void {
  for (const key of Object.keys(values)) {
    if (!ENGINE_KEY_PATTERN.test(key) || !KNOWN_ENGINE_KEYS.has(key)) {
      throw new HttpException(
        `Invalid engine value key: ${key}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  const { DAJ, DDB, QQQ, DCJ, DAX } = values;

  if (!DAJ) {
    throw new HttpException('DAJ is required', HttpStatus.UNPROCESSABLE_ENTITY);
  }
  if (!DDB) {
    throw new HttpException('DDB is required', HttpStatus.UNPROCESSABLE_ENTITY);
  }
  if (!QQQ) {
    throw new HttpException('QQQ is required', HttpStatus.UNPROCESSABLE_ENTITY);
  }

  if (!DDB_DIGITS.test(DDB) && !DDB_MICHIGAN.test(DDB)) {
    throw new HttpException(
      `Invalid DDB format: ${DDB}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (DCJ_REQUIRED_STATES.includes(DAJ) && !DCJ) {
    throw new HttpException(
      `DCJ is required for ${DAJ}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (DAJ === 'OH' && !DAX) {
    throw new HttpException(
      'DAX is required for OH',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

// Per-profile renderFieldSet (PLAN §2.2): internal render принимает строго поля
// объявленного статического профиля. Если профиль не объявил список — проверка
// не применяется (обратная совместимость).
export function validateRenderFieldSet(
  values: EngineValues,
  allowed: string[] | undefined,
): void {
  if (!allowed || allowed.length === 0) {
    return;
  }
  const set = new Set(allowed);
  for (const key of Object.keys(values)) {
    if (!set.has(key)) {
      throw new HttpException(
        `Engine field ${key} is not allowed for this profile`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
}
