/** Maps an English message tree to the same shape with string leaves, so a Hindi tree typed with it fails the build on any missing/extra key. */
export type Translations<T> = { [K in keyof T]: T[K] extends string ? string : Translations<T[K]> };
