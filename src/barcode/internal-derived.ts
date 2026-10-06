// Внутренние derived-поля для OH/AB: DAX строится из DAW (фунты → кг) до
// profile validation. Публичные flows это не применяют.
export function applyInternalDerivations(
  values: Record<string, string>,
): Record<string, string> {
  const out = { ...values };
  if ((out.DAJ === 'OH' || out.DAJ === 'AB') && out.DAW && !out.DAX) {
    const lbs = Number(out.DAW);
    if (Number.isFinite(lbs)) {
      out.DAX = String(Math.round(lbs * 0.45359237));
    }
  }
  return out;
}
