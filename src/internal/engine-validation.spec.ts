import { HttpException } from '@nestjs/common';
import {
  validateInternalEngineValues,
  validateRenderFieldSet,
} from './engine-validation';

const base = { DAJ: 'AR', DDB: '03012018', QQQ: 'DL' };

describe('validateInternalEngineValues', () => {
  it('accepts a valid engine values object', () => {
    expect(() =>
      validateInternalEngineValues({ ...base, DAC: 'JUNIOR' }),
    ).not.toThrow();
  });

  it('rejects non-engine keys (public field names)', () => {
    expect(() =>
      validateInternalEngineValues({ ...base, 'First Name': 'JUNIOR' }),
    ).toThrow(HttpException);
  });

  it('rejects unknown-but-well-formed engine keys', () => {
    expect(() =>
      validateInternalEngineValues({ ...base, ZZZ: 'x' }),
    ).toThrow(HttpException);
  });

  it('rejects missing DAJ/DDB/QQQ', () => {
    expect(() => validateInternalEngineValues({ DDB: '03012018', QQQ: 'DL' })).toThrow(HttpException);
    expect(() => validateInternalEngineValues({ DAJ: 'AR', QQQ: 'DL' })).toThrow(HttpException);
    expect(() => validateInternalEngineValues({ DAJ: 'AR', DDB: '03012018' })).toThrow(HttpException);
  });

  it('accepts Michigan DDB format', () => {
    expect(() =>
      validateInternalEngineValues({ DAJ: 'MI', DDB: 'Rev 01-21-2011', QQQ: 'DL' }),
    ).not.toThrow();
  });

  it('rejects malformed DDB', () => {
    expect(() =>
      validateInternalEngineValues({ ...base, DDB: '2018-03-01' }),
    ).toThrow(HttpException);
  });

  it('requires DCJ for WA/CO/LA', () => {
    expect(() =>
      validateInternalEngineValues({ DAJ: 'WA', DDB: '03012018', QQQ: 'DL' }),
    ).toThrow(HttpException);
    expect(() =>
      validateInternalEngineValues({ DAJ: 'WA', DDB: '03012018', QQQ: 'DL', DCJ: 'X1' }),
    ).not.toThrow();
  });

  it('requires DAX for OH', () => {
    expect(() =>
      validateInternalEngineValues({ DAJ: 'OH', DDB: '03012018', QQQ: 'DL' }),
    ).toThrow(HttpException);
  });
});

describe('validateRenderFieldSet', () => {
  it('is a no-op when profile declares no allowlist', () => {
    expect(() => validateRenderFieldSet({ ZZZ: 'x' }, undefined)).not.toThrow();
    expect(() => validateRenderFieldSet({ ZZZ: 'x' }, [])).not.toThrow();
  });

  it('accepts fields within the profile allowlist', () => {
    expect(() =>
      validateRenderFieldSet({ DAJ: 'CA', DDB: 'x' }, ['DAJ', 'DDB']),
    ).not.toThrow();
  });

  it('rejects fields outside the profile allowlist', () => {
    expect(() =>
      validateRenderFieldSet({ DAJ: 'CA', ZZZ: 'x' }, ['DAJ', 'DDB']),
    ).toThrow(HttpException);
  });
});
