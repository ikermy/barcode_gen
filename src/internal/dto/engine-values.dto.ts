// Canonical internal Engine DTO (PLAN §2.2): единый источник истины для
// AAMVA-ключей и формата engine values internal render.
//
// Валидация выполняется функцией `validateInternalEngineValues`
// (см. `../engine-validation.ts`): class-validator намеренно не используется —
// правила условны по DAJ/DDB (какие поля обязательны) и выражаются кодом
// точнее, чем декларативный DTO. Этот файл фиксирует канонический контракт.

// Ключ engine-поля: ровно три символа [A-Z0-9].
export const ENGINE_KEY_PATTERN = /^[A-Z0-9]{3}$/;

// DDB: 8 цифр (стандартные профили) либо Michigan literal.
export const DDB_DIGITS = /^\d{8}$/;
export const DDB_MICHIGAN = /^Rev \d{2}-\d{2}-\d{4}$/;

// Union AAMVA-кодов, которые реально читают builders (извлечено из
// `barcode-config.service.ts`: `data.XXX`). Ключ верного формата, но не из этого
// набора, отклоняется. Точный per-profile allowlist — `BarcodeConfigs.renderFields`.
export const KNOWN_ENGINE_KEYS: ReadonlySet<string> = new Set<string>([
  'QQQ',
  'DAC', 'DAD', 'DAG', 'DAH', 'DAI', 'DAJ', 'DAK', 'DAQ', 'DAU', 'DAW', 'DAX',
  'DAY', 'DAZ',
  'DBA', 'DBB', 'DBC', 'DBD',
  'DCA', 'DCB', 'DCD', 'DCF', 'DCJ', 'DCK', 'DCL', 'DCS', 'DCU',
  'DDA', 'DDB', 'DDK', 'DDL',
  'ZAF', 'ZCB', 'ZFA', 'ZFC', 'ZFJ', 'ZGD', 'ZGG', 'ZGH', 'ZIC',
  'ZLA', 'ZLB', 'ZLC', 'ZLE', 'ZLF', 'ZLI',
  'ZMA', 'ZMB', 'ZMD', 'ZNA', 'ZNB', 'ZNI', 'ZOA', 'ZOZ', 'ZPC', 'ZWA',
]);

// Профили, где обязателен DCJ (audit code) в engine values.
export const DCJ_REQUIRED_STATES: readonly string[] = ['WA', 'CO', 'LA'];

// EngineValues — карта AAMVA-код → значение (все строки).
export type EngineValues = Record<string, string>;
