/**
 * 这里统一处理项目里“接口字段使用 snake_case、前端业务层使用 camelCase”的转换。
 *
 * 包含两部分能力：
 * 1. 类型层转换：让 TypeScript 能推导出转换后的字段名。
 * 2. 运行时转换：把真实对象的 key 在 snake_case 和 camelCase 之间互转。
 *
 * 这样做的目的，是尽量减少重复定义类型和手写字段映射。
 */

export type SnakeToCamel<S extends string> =
    S extends `${infer Head}_${infer Tail}`
        ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
        : S;

export type CamelToSnake<S extends string> =
    S extends `${infer Head}${infer Tail}`
        ? Tail extends Uncapitalize<Tail>
            ? `${Lowercase<Head>}${CamelToSnake<Tail>}`
            : `${Lowercase<Head>}_${CamelToSnake<Uncapitalize<Tail>>}`
        : S;

export type Camelized<T> =
    T extends Array<infer Item>
        ? Array<Camelized<Item>>
        : T extends object
            ? {
                [Key in keyof T as Key extends string ? SnakeToCamel<Key> : Key]: Camelized<T[Key]>;
            }
            : T;

export type Snakeized<T> =
    T extends Array<infer Item>
        ? Array<Snakeized<Item>>
        : T extends object
            ? {
                [Key in keyof T as Key extends string ? CamelToSnake<Key> : Key]: Snakeized<T[Key]>;
            }
            : T;

/**
 * 只把普通对象当作需要做 key 转换的目标，避免误处理 Date、File 之类特殊对象。
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === "[object Object]";
}

/**
 * 把单个 snake_case key 转成 camelCase。
 */
function snakeToCamelKey(value: string): string {
    return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

/**
 * 把单个 camelCase key 转成 snake_case。
 */
function camelToSnakeKey(value: string): string {
    return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

/**
 * 递归把对象和数组里的所有 key 从 snake_case 转成 camelCase。
 * 这个方法主要用于把后端响应统一转成前端业务层更容易使用的命名风格。
 */
export function camelizeKeys<T>(value: T): Camelized<T> {
    if (Array.isArray(value)) {
        return value.map((item) => camelizeKeys(item)) as Camelized<T>;
    }
    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [snakeToCamelKey(key), camelizeKeys(item)]),
        ) as Camelized<T>;
    }
    return value as Camelized<T>;
}

/**
 * 递归把对象和数组里的所有 key 从 camelCase 转成 snake_case。
 * 同时会过滤掉值为 undefined 的字段，避免把无意义的空字段发给后端。
 */
export function snakeizeKeys<T>(value: T): Snakeized<T> {
    if (Array.isArray(value)) {
        return value.map((item) => snakeizeKeys(item)) as Snakeized<T>;
    }
    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, item]) => item !== undefined)
                .map(([key, item]) => [camelToSnakeKey(key), snakeizeKeys(item)]),
        ) as Snakeized<T>;
    }
    return value as Snakeized<T>;
}
