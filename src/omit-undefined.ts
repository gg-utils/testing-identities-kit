/** Omit absent optional values when forwarding options; JSON payloads stay identical. */
export function omitUndefined<const T extends object>(value: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> };
}
