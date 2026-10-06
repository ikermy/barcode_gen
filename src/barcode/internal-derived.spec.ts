import { applyInternalDerivations } from './internal-derived';

describe('applyInternalDerivations', () => {
  it('builds DAX from DAW for OH (lbs -> kg)', () => {
    const out = applyInternalDerivations({ DAJ: 'OH', DAW: '150' });
    expect(out.DAX).toBe(String(Math.round(150 * 0.45359237)));
  });

  it('builds DAX from DAW for AB', () => {
    const out = applyInternalDerivations({ DAJ: 'AB', DAW: '200' });
    expect(out.DAX).toBe(String(Math.round(200 * 0.45359237)));
  });

  it('keeps explicit DAX', () => {
    const out = applyInternalDerivations({ DAJ: 'OH', DAW: '150', DAX: '999' });
    expect(out.DAX).toBe('999');
  });

  it('ignores non-OH/AB states', () => {
    const out = applyInternalDerivations({ DAJ: 'CA', DAW: '150' });
    expect(out.DAX).toBeUndefined();
  });

  it('ignores non-numeric DAW', () => {
    const out = applyInternalDerivations({ DAJ: 'OH', DAW: 'abc' });
    expect(out.DAX).toBeUndefined();
  });
});
