export function checkRequired(obj: object, keys: string[]): { valid: boolean, missing: string[] } {
  const missing = keys.filter(key => typeof obj[key] === 'undefined')

  return missing.length ? { valid: false, missing } : { valid: true, missing }
}
