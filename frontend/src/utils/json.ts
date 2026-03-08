export function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export function parseJsonInput<T>(value: string, fieldName: string): T {
  try {
    return JSON.parse(value) as T
  } catch {
    throw new Error(`${fieldName} must be valid JSON`)
  }
}
