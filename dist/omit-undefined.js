/** Omit absent optional values when forwarding options; JSON payloads stay identical. */
export function omitUndefined(value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
//# sourceMappingURL=omit-undefined.js.map