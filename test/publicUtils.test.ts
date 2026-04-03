import {it, expect, describe} from 'vitest'
import {faux} from '../src'
describe('publicUtils', () => {
  it('should generate deterministic UUIDs', () => {
    expect(faux.utils.deterministicUUID(1)).toMatchInlineSnapshot('"00000000-0000-4000-8000-000000000001"')
    expect(faux.utils.deterministicUUID(2)).toMatchInlineSnapshot('"00000000-0000-4000-8000-000000000002"')
    expect(faux.utils.deterministicUUID(123456789)).toMatchInlineSnapshot('"00000000-0000-4000-8000-0000075bcd15"')
    expect(faux.utils.deterministicUUID(Number.MAX_SAFE_INTEGER)).toMatchInlineSnapshot('"00000000-0000-4000-801f-ffffffffffff"')
    expect(() => faux.utils.deterministicUUID(Number.MAX_SAFE_INTEGER + 1)).toThrowErrorMatchingInlineSnapshot('"deterministicUUID(9007199254740992) must be a safe integer between Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER"')
    expect(() => faux.utils.deterministicUUID(Number.MIN_SAFE_INTEGER - 1)).toThrowErrorMatchingInlineSnapshot('"deterministicUUID(-9007199254740992) must be a safe integer between Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER"')
    expect(() => faux.utils.deterministicUUID(1.5)).toThrowErrorMatchingInlineSnapshot('"deterministicUUID(1.5) must be a safe integer between Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER"')
  })
})
