import { describe, expect, it } from 'vitest';

import { serializeCanonicalJson } from '../src/canonical-json';

describe('canonical JSON serialization', () => {
  it('sorts object keys recursively without changing array order', () => {
    expect(serializeCanonicalJson({ z: [2, { b: true, a: null }], a: 'first' })).toBe(
      '{"a":"first","z":[2,{"a":null,"b":true}]}',
    );
  });

  it('rejects a non-JSON number instead of creating a divergent hash material', () => {
    expect(() => serializeCanonicalJson(Number.NaN)).toThrow('finite numbers');
  });
});
