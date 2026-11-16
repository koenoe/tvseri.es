/**
 * A small evaluator for DynamoDB expressions (condition, key condition,
 * filter, update and projection), enough for the in-memory test double.
 * Items are plain (unmarshalled) objects.
 */

import { RESERVED_WORDS } from './reserved';

export type Item = Record<string, unknown>;

type Names = Readonly<Record<string, string>> | undefined;
type Values = Readonly<Record<string, unknown>> | undefined;

type Token = Readonly<{
  type: 'name' | 'value' | 'word' | 'punct';
  text: string;
}>;

const PUNCT = [
  '<>',
  '<=',
  '>=',
  '=',
  '<',
  '>',
  '(',
  ')',
  ',',
  '.',
  '[',
  ']',
  '+',
  '-',
];

const tokenize = (expression: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const char = expression[i]!;
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    const punct = PUNCT.find((p) => expression.startsWith(p, i));
    if (punct) {
      tokens.push({ text: punct, type: 'punct' });
      i += punct.length;
      continue;
    }
    const match = /^[#:]?[A-Za-z0-9_]+/.exec(expression.slice(i));
    if (!match) {
      throw new Error(`Unexpected character "${char}" in: ${expression}`);
    }
    const text = match[0];
    tokens.push({
      text,
      type: text.startsWith('#')
        ? 'name'
        : text.startsWith(':')
          ? 'value'
          : 'word',
    });
    i += text.length;
  }
  return tokens;
};

type PathPart = string | number;
type Operand =
  | Readonly<{ kind: 'path'; path: PathPart[] }>
  | Readonly<{ kind: 'value'; value: unknown }>
  | Readonly<{ kind: 'size'; path: PathPart[] }>
  | Readonly<{ kind: 'ifNotExists'; path: PathPart[]; fallback: Operand }>
  | Readonly<{ kind: 'listAppend'; a: Operand; b: Operand }>
  | Readonly<{ kind: 'arith'; op: '+' | '-'; a: Operand; b: Operand }>;

class Parser {
  private index = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly names: Names,
    private readonly values: Values,
  ) {}

  peek(offset = 0) {
    return this.tokens[this.index + offset];
  }

  done() {
    return this.index >= this.tokens.length;
  }

  next() {
    const token = this.tokens[this.index++];
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    return token;
  }

  isWord(word: string, offset = 0) {
    const token = this.peek(offset);
    return token?.type === 'word' && token.text.toUpperCase() === word;
  }

  isPunct(text: string) {
    const token = this.peek();
    return token?.type === 'punct' && token.text === text;
  }

  expect(text: string) {
    const token = this.next();
    if (token.text.toUpperCase() !== text.toUpperCase()) {
      throw new Error(`Expected "${text}", got "${token.text}"`);
    }
  }

  name(token: Token) {
    if (token.type === 'name') {
      const resolved = this.names?.[token.text];
      if (resolved === undefined) {
        throw new Error(`Missing ExpressionAttributeNames ${token.text}`);
      }
      return resolved;
    }
    if (token.type === 'word') {
      if (RESERVED_WORDS.has(token.text.toUpperCase())) {
        throw new Error(
          `ValidationException: Attribute name is a reserved keyword; reserved keyword: ${token.text}`,
        );
      }
      return token.text;
    }
    throw new Error(`Expected an attribute name, got "${token.text}"`);
  }

  path(): PathPart[] {
    const parts: PathPart[] = [this.name(this.next())];
    while (this.isPunct('.') || this.isPunct('[')) {
      if (this.next().text === '.') {
        parts.push(this.name(this.next()));
      } else {
        parts.push(Number(this.next().text));
        this.expect(']');
      }
    }
    return parts;
  }

  value(token: Token) {
    if (!this.values || !Object.hasOwn(this.values, token.text)) {
      throw new Error(`Missing ExpressionAttributeValues ${token.text}`);
    }
    return this.values[token.text];
  }

  operand(): Operand {
    const token = this.peek();
    if (!token) {
      throw new Error('Expected an operand');
    }
    if (token.type === 'value') {
      this.next();
      return { kind: 'value', value: this.value(token) };
    }
    if (this.isWord('SIZE') && this.peek(1)?.text === '(') {
      this.next();
      this.expect('(');
      const path = this.path();
      this.expect(')');
      return { kind: 'size', path };
    }
    return { kind: 'path', path: this.path() };
  }

  updateOperand(): Operand {
    if (this.isWord('IF_NOT_EXISTS')) {
      this.next();
      this.expect('(');
      const path = this.path();
      this.expect(',');
      const fallback = this.updateOperand();
      this.expect(')');
      return { fallback, kind: 'ifNotExists', path };
    }
    if (this.isWord('LIST_APPEND')) {
      this.next();
      this.expect('(');
      const a = this.updateOperand();
      this.expect(',');
      const b = this.updateOperand();
      this.expect(')');
      return { a, b, kind: 'listAppend' };
    }
    return this.operand();
  }

  updateValue(): Operand {
    const a = this.updateOperand();
    if (this.isPunct('+') || this.isPunct('-')) {
      const op = this.next().text as '+' | '-';
      const b = this.updateOperand();
      return { a, b, kind: 'arith', op };
    }
    return a;
  }
}

const getPath = (item: Item, path: ReadonlyArray<PathPart>): unknown => {
  let current: unknown = item;
  for (const part of path) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string | number, unknown>)[part];
  }
  return current;
};

const setPath = (item: Item, path: ReadonlyArray<PathPart>, value: unknown) => {
  let current: Record<string | number, unknown> = item;
  for (const part of path.slice(0, -1)) {
    current = current[part] as Record<string | number, unknown>;
    if (current == null) {
      throw new Error('ValidationException: document path does not exist');
    }
  }
  current[path.at(-1)!] = value;
};

const removePath = (item: Item, path: ReadonlyArray<PathPart>) => {
  const parent = path.length > 1 ? getPath(item, path.slice(0, -1)) : item;
  const last = path.at(-1)!;
  if (Array.isArray(parent) && typeof last === 'number') {
    parent.splice(last, 1);
  } else if (parent && typeof parent === 'object') {
    delete (parent as Record<string | number, unknown>)[last];
  }
};

const resolve = (operand: Operand, item: Item): unknown => {
  switch (operand.kind) {
    case 'value':
      return operand.value;
    case 'path':
      return getPath(item, operand.path);
    case 'size': {
      const value = getPath(item, operand.path);
      if (typeof value === 'string' || Array.isArray(value)) {
        return value.length;
      }
      if (value instanceof Set) {
        return value.size;
      }
      if (value && typeof value === 'object') {
        return Object.keys(value).length;
      }
      return undefined;
    }
    case 'ifNotExists': {
      const value = getPath(item, operand.path);
      return value === undefined ? resolve(operand.fallback, item) : value;
    }
    case 'listAppend':
      return [
        ...((resolve(operand.a, item) as unknown[]) ?? []),
        ...((resolve(operand.b, item) as unknown[]) ?? []),
      ];
    case 'arith': {
      const a = resolve(operand.a, item);
      const b = resolve(operand.b, item);
      if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error('ValidationException: arithmetic on a non-number');
      }
      return operand.op === '+' ? a + b : a - b;
    }
  }
};

const isComparable = (a: unknown, b: unknown) =>
  (typeof a === 'string' && typeof b === 'string') ||
  (typeof a === 'number' && typeof b === 'number');

const equals = (a: unknown, b: unknown): boolean => {
  if (a instanceof Set && b instanceof Set) {
    return a.size === b.size && [...a].every((value) => b.has(value));
  }
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
};

const compare = (op: string, a: unknown, b: unknown): boolean => {
  if (op === '=') {
    return a !== undefined && equals(a, b);
  }
  if (op === '<>') {
    return !equals(a, b);
  }
  if (!isComparable(a, b)) {
    return false;
  }
  const left = a as string | number;
  const right = b as string | number;
  switch (op) {
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    case '>=':
      return left >= right;
    default:
      throw new Error(`Unknown comparator ${op}`);
  }
};

type Predicate = (item: Item) => boolean;

const COMPARATORS = new Set(['=', '<>', '<', '<=', '>', '>=']);

const parseCondition = (parser: Parser): Predicate => {
  const parseOr = (): Predicate => {
    let left = parseAnd();
    while (parser.isWord('OR')) {
      parser.next();
      const a = left;
      const b = parseAnd();
      left = (item) => a(item) || b(item);
    }
    return left;
  };

  const parseAnd = (): Predicate => {
    let left = parseNot();
    while (parser.isWord('AND')) {
      parser.next();
      const a = left;
      const b = parseNot();
      left = (item) => a(item) && b(item);
    }
    return left;
  };

  const parseNot = (): Predicate => {
    if (parser.isWord('NOT')) {
      parser.next();
      const inner = parseNot();
      return (item) => !inner(item);
    }
    return parsePrimary();
  };

  const parseFunction = (): Predicate | undefined => {
    const token = parser.peek();
    if (token?.type !== 'word' || parser.peek(1)?.text !== '(') {
      return undefined;
    }
    const fn = token.text.toLowerCase();
    if (fn === 'size') {
      return undefined;
    }
    parser.next();
    parser.expect('(');
    if (fn === 'attribute_exists' || fn === 'attribute_not_exists') {
      const path = parser.path();
      parser.expect(')');
      return fn === 'attribute_exists'
        ? (item) => getPath(item, path) !== undefined
        : (item) => getPath(item, path) === undefined;
    }
    const a = parser.operand();
    parser.expect(',');
    const b = parser.operand();
    parser.expect(')');
    if (fn === 'begins_with') {
      return (item) => {
        const value = resolve(a, item);
        const prefix = resolve(b, item);
        return (
          typeof value === 'string' &&
          typeof prefix === 'string' &&
          value.startsWith(prefix)
        );
      };
    }
    if (fn === 'contains') {
      return (item) => {
        const value = resolve(a, item);
        const needle = resolve(b, item);
        if (typeof value === 'string') {
          return typeof needle === 'string' && value.includes(needle);
        }
        if (value instanceof Set) {
          return value.has(needle);
        }
        if (Array.isArray(value)) {
          return value.some((entry) => equals(entry, needle));
        }
        return false;
      };
    }
    throw new Error(`Unsupported function ${fn}`);
  };

  const parsePrimary = (): Predicate => {
    if (parser.isPunct('(')) {
      parser.next();
      const inner = parseOr();
      parser.expect(')');
      return inner;
    }
    const fn = parseFunction();
    if (fn) {
      return fn;
    }
    const left = parser.operand();
    if (parser.isWord('BETWEEN')) {
      parser.next();
      const low = parser.operand();
      parser.expect('AND');
      const high = parser.operand();
      return (item) => {
        const value = resolve(left, item);
        return (
          compare('>=', value, resolve(low, item)) &&
          compare('<=', value, resolve(high, item))
        );
      };
    }
    if (parser.isWord('IN')) {
      parser.next();
      parser.expect('(');
      const options = [parser.operand()];
      while (parser.isPunct(',')) {
        parser.next();
        options.push(parser.operand());
      }
      parser.expect(')');
      return (item) => {
        const value = resolve(left, item);
        return options.some((option) => equals(value, resolve(option, item)));
      };
    }
    const op = parser.next().text;
    if (!COMPARATORS.has(op)) {
      throw new Error(`Expected a comparator, got "${op}"`);
    }
    const right = parser.operand();
    return (item) => compare(op, resolve(left, item), resolve(right, item));
  };

  const predicate = parseOr();
  if (!parser.done()) {
    throw new Error(`Unexpected token "${parser.peek()?.text}"`);
  }
  return predicate;
};

/** Evaluates a condition/filter/key-condition expression against an item */
export const evaluateCondition = (
  expression: string,
  item: Item,
  names: Names,
  values: Values,
): boolean =>
  parseCondition(new Parser(tokenize(expression), names, values))(item);

/** Applies an UpdateExpression to a copy of the item and returns it */
export const applyUpdate = (
  expression: string,
  original: Item,
  names: Names,
  values: Values,
): Item => {
  const item = structuredClone(original);
  const parser = new Parser(tokenize(expression), names, values);
  const clauses = new Set(['SET', 'REMOVE', 'ADD', 'DELETE']);
  const isClauseStart = () =>
    clauses.has(parser.peek()?.text.toUpperCase() ?? '') &&
    parser.peek()?.type === 'word';

  // Values are resolved against the item as it was before the update
  const assignments: Array<() => void> = [];

  while (!parser.done()) {
    const clause = parser.next().text.toUpperCase();
    do {
      if (parser.isPunct(',')) {
        parser.next();
      }
      const path = parser.path();
      if (clause === 'SET') {
        parser.expect('=');
        const value = resolve(parser.updateValue(), original);
        assignments.push(() => setPath(item, path, value));
      } else if (clause === 'REMOVE') {
        assignments.push(() => removePath(item, path));
      } else if (clause === 'ADD' || clause === 'DELETE') {
        const value = resolve(parser.operand(), original);
        const current = getPath(original, path);
        assignments.push(() => {
          if (clause === 'ADD' && typeof value === 'number') {
            setPath(item, path, ((current as number | undefined) ?? 0) + value);
          } else if (value instanceof Set) {
            const next = new Set(current instanceof Set ? current : []);
            for (const entry of value) {
              if (clause === 'ADD') {
                next.add(entry);
              } else {
                next.delete(entry);
              }
            }
            if (next.size === 0) {
              removePath(item, path);
            } else {
              setPath(item, path, next);
            }
          } else {
            throw new Error(`${clause} needs a number or a set`);
          }
        });
      } else {
        throw new Error(`Unknown update clause ${clause}`);
      }
    } while (parser.isPunct(','));
    if (!parser.done() && !isClauseStart()) {
      throw new Error(`Unexpected token "${parser.peek()?.text}"`);
    }
  }

  for (const assign of assignments) {
    assign();
  }
  return item;
};

/** Keeps only the projected (top-level) attributes */
export const applyProjection = (
  expression: string | undefined,
  item: Item,
  names: Names,
): Item => {
  if (!expression) {
    return item;
  }
  const parser = new Parser(tokenize(expression), names, undefined);
  const projected: Item = {};
  do {
    if (parser.isPunct(',')) {
      parser.next();
    }
    const [top] = parser.path();
    if (top !== undefined && Object.hasOwn(item, top)) {
      projected[top] = item[top as string];
    }
  } while (parser.isPunct(','));
  return projected;
};
