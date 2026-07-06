export function currencySymbol(currencyCode, locale = 'en') {
  if (!currencyCode) return '';
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol',
    }).formatToParts(0);
    const symbolPart = parts.find((p) => p.type === 'currency');
    return symbolPart ? symbolPart.value : currencyCode;
  } catch {
    return currencyCode;
  }
}