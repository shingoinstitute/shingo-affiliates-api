export function checkRequired(obj: object, keys: string[]) {
  const missing = new Array<string>()
  for (const key of keys) {
    if ((obj as any)[key] === undefined) missing.push(key)
  }

  return missing.length ? { valid: false, missing } : { valid: true, missing }
}
