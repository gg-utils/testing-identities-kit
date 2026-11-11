/** Omit absent optional values when forwarding options; JSON payloads stay identical. */
export declare function omitUndefined<const T extends object>(value: T): {
    [K in keyof T]: Exclude<T[K], undefined>;
};
//# sourceMappingURL=omit-undefined.d.ts.map