export function parseEnvInt(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    console.warn(`${name} must be a positive integer. Using ${fallback}.`);
    return fallback;
  }

  return numberValue;
}
