import {it, expect, describe} from 'vitest'
import {faux} from '../src'
import {validateInternalConfig} from '../src/validation'
import {InternalConfig} from '../src/types'
import {DefinitionRegistry} from '../src/DefinitionRegistry'

describe('errors', () => {

  /**
   * This is a tough test to write in a single file so we use :any to bypass
   * the type system. The point of this test is to ensure that if a circular
   * dependency is detected, an error is thrown instead of an infinite loop or
   * stack overflow.
   */
  it('should throw an error given a circular dependency', () => {
    const context: any = faux.defineContext({
      helpers: {}
    })


    let A: any
    let B: any

    A = context.defineModel(({find}: any) => (
      {name: 'ModelA', modelB: find(B) as any}
    ))

    B = context.defineModel(({find}: any) => ({name: 'ModelB', modelA: find(A) as any}))

    const useFixtures = context.defineFixtures({
      A,
      B,
    })

    /** Since we evaluate lazily this will not immediately throw */
    const f = useFixtures()

    expect(() => f.A).toThrowErrorMatchingInlineSnapshot('"Circular dependency detected in model resolution for model: A"')

    expect(() => f.B).toThrowErrorMatchingInlineSnapshot('"Circular dependency detected in model resolution for model: B"')
  })

  /**
   * This may happen in some cases where the import tree is not fully resolved
   * or if the user accidentally passes an undefined value to find.
  **/
  it('should throw an error if an undefined value is passed to find', () => {
    const context =
      faux.defineContext({
        helpers: {}
      })

    const modelA = context.defineModel(({find}) => ({name: 'ModelA', modelB: find(undefined as any)}))
    const useFixtures = context.defineFixtures({
      modelA,
    })

    const f = useFixtures()

    expect(() => f.modelA).toThrowErrorMatchingInlineSnapshot('"Received undefined instead of a model definition. This likely means there is a circular dependency in your model definitions imports."')
  })

  it('should throw when resolving a model that is not in the registry', () => {
    const context = faux.defineContext({
      helpers: {}
    })


    const unresolved = context.defineModel(() => ({name: 'UnresolvedModel'}))

    const resolved = context.defineModel(({find}) => ({name: 'ModelA', modelB: find(unresolved)}))

    const useFixtures = context.defineFixtures({
      resolved,
    })

    const f = useFixtures()

    expect(() => f.resolved).toThrowErrorMatchingInlineSnapshot('"Model not found in registry. Available models: [resolved]. Make sure the model is included in the context.defineFixtures() models parameter."')

    expect(() => f.update('unresolved' as any, null!)).toThrowErrorMatchingInlineSnapshot('"Model \'unresolved\' not found in registry. Available models: [resolved]"')
    expect(() => f.reset('unresolved' as any)).toThrowErrorMatchingInlineSnapshot('"Model \'unresolved\' not found in registry. Available models: [resolved]"')
  })


  describe('internal config validation', () => {
    const baseInternalConfig: InternalConfig
      = {
      seed: 1,
      cursorIncrease: 1000,
      contextDef: null!,
      getSharedValue: () => ({}),
      override: {},
      sharedOverride: {},
      helperOverride: {},
    }

    it('should not throw if config is valid', () => {
      expect(() => validateInternalConfig(baseInternalConfig)).not.toThrow()
    })

    const cases: [string, Partial<InternalConfig>][] = [
      ['should throw if seed is not a number', {seed: 'not a number' as any}],
      ['should throw if cursorIncrease is not a number', {cursorIncrease: 'not a number' as any}],
      ['should throw if cursorIncrease is negative', {cursorIncrease: -1}],
      ['should throw if cursorIncrease is not positive', {cursorIncrease: 0}],
      ['should throw if override is not an object', {override: 'not an object' as any}],
      ['should throw if sharedOverride is not an object', {sharedOverride: 'not an object' as any}],
      ['should throw if getSharedValue is not a function', {getSharedValue: 'not a function' as any}],
      ['should throw if seed is less than 1', {seed: 0}],
      ['should throw if seed is not an integer', {seed: 1.5}],
      ['should throw if seed is greater than Number.MAX_SAFE_INTEGER', {seed: Number.MAX_SAFE_INTEGER + 1}]
    ]

    cases.forEach(([description, config]) => {
      it(description, () => {
        expect(() => validateInternalConfig({
          ...baseInternalConfig,
          ...config,
        })).toThrowErrorMatchingSnapshot()
      })
    })
  })

  describe('internal definition registry error', () => {
    /** 100% coverage for this theoretically impossible error */
    it('should throw if the model is not found in the registry by name', () => {
      expect(() => new DefinitionRegistry({}).findModelByName('nonexistent')).toThrowErrorMatchingInlineSnapshot('"Model \'nonexistent\' not found in registry. Available models: []"')
    })
  })
})

describe('error passthrough', () => {
  it('should pass through helper errors from the expected location', () => {
    const context = faux.defineContext({
      helpers: {
        thrower: () => {
          throw new Error('This is a helper error')
        }
      }
    })
    const model = context.defineModel(({helpers}) => {
      helpers.thrower
      return {name: 'ModelA'}
    })

    const useFixtures = context.defineFixtures({
      model,
    })

    const f = useFixtures()

    expect(() => useFixtures().model).toThrowErrorMatchingInlineSnapshot('"This is a helper error"')
  })


  it('should pass through "shared" errors in the expected location', () => {
    const context = faux.defineContext({
      helpers: {},
      shared: () => {
        throw new Error('This is a shared error')
      }
    })

    const model = context.defineModel(() => {
      return {name: 'ModelA'}
    })

    const useFixtures = context.defineFixtures({
      model,
    })

    expect(() => useFixtures()).toThrowErrorMatchingInlineSnapshot('"This is a shared error"')
  })

  it('should pass through factory errors in the expected location', () => {
    const context = faux.defineContext({
      helpers: {},
    })

    const model = context.defineModel(() => {
      if (true) {
        throw new Error('This is a factory error')

      }
      return {}
    })

    const useFixtures = context.defineFixtures({
      model,
    })
    const f = useFixtures()

    expect(() => f.model).toThrowErrorMatchingInlineSnapshot('"This is a factory error"')

  })

})
