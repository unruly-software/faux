import {describe, it, expectTypeOf} from 'vitest'
import {faux} from '../src'

describe('Type System Tests', () => {
  describe('Helper Types', () => {
    it('should properly type helper functions and their return values', () => {
      const context = faux.defineContext({
        helpers: {
          stringHelper: () => 'test' as const,
          numberHelper: (ctx) => ctx.getCursor(),
          objectHelper: () => ({id: 1, name: 'test'}),
          arrayHelper: () => [1, 2, 3] as const,
        }
      })

      const model = context.defineModel((ctx) => {
        expectTypeOf(ctx.helpers.stringHelper).toEqualTypeOf<'test'>()
        expectTypeOf(ctx.helpers.numberHelper).toEqualTypeOf<number>()
        expectTypeOf(ctx.helpers.objectHelper).toEqualTypeOf<{id: number; name: string}>()
        expectTypeOf(ctx.helpers.arrayHelper).toEqualTypeOf<readonly [1, 2, 3]>()

        return {
          str: ctx.helpers.stringHelper,
          num: ctx.helpers.numberHelper,
          obj: ctx.helpers.objectHelper,
          arr: ctx.helpers.arrayHelper,
        }
      })

      type ModelData = {
        str: 'test'
        num: number
        obj: {id: number; name: string}
        arr: readonly [1, 2, 3]
      }

      expectTypeOf(model.factory).parameter(0).toMatchTypeOf<{
        helpers: {
          stringHelper: 'test'
          numberHelper: number
          objectHelper: {id: number; name: string}
          arrayHelper: readonly [1, 2, 3]
        }
        shared: Record<string, never>
        seed: number
        getCursor: () => number
        find: <T>(model: any) => T
      }>()
    })
  })

  describe('Shared State Types', () => {
    it('should properly infer shared state types', () => {
      const context = faux.defineContext({
        helpers: {
          id: (ctx) => ctx.getCursor(),
          uuid: () => 'uuid-123' as const,
        },
        shared: (ctx) => ({
          tenantId: ctx.helpers.id,
          globalId: ctx.helpers.uuid,
          computed: `tenant-${ctx.helpers.id}` as const,
        })
      })

      const model = context.defineModel((ctx) => {
        expectTypeOf(ctx.shared).toEqualTypeOf<{
          tenantId: number
          globalId: 'uuid-123'
          computed: `tenant-${number}`
        }>()

        expectTypeOf(ctx.shared.tenantId).toEqualTypeOf<number>()
        expectTypeOf(ctx.shared.globalId).toEqualTypeOf<'uuid-123'>()
        expectTypeOf(ctx.shared.computed).toEqualTypeOf<`tenant-${number}`>()

        return {id: ctx.shared.tenantId}
      })

      expectTypeOf(model).toMatchTypeOf<any>()
    })

    it('should handle context without shared state', () => {
      const context = faux.defineContext({
        helpers: {
          id: () => 1,
        }
      })

      const model = context.defineModel((ctx) => {
        expectTypeOf(ctx.shared).toEqualTypeOf<Record<string, never>>()

        return {id: ctx.helpers.id}
      })

      expectTypeOf(model).toMatchTypeOf<any>()
    })
  })

  describe('Model Factory Types', () => {
    it('should properly type model context parameters', () => {
      const context = faux.defineContext({
        helpers: {
          faker: (ctx) => ({name: `User${ctx.seed}`}),
          id: (ctx) => ctx.getCursor(),
        },
        shared: (ctx) => ({
          tenantId: ctx.helpers.id,
        })
      })

      const model = context.defineModel((ctx) => {
        expectTypeOf(ctx.seed).toEqualTypeOf<number>()
        expectTypeOf(ctx.getCursor).toEqualTypeOf<() => number>()
        expectTypeOf(ctx.helpers).toEqualTypeOf<{
          faker: {name: string}
          id: number
        }>()
        expectTypeOf(ctx.shared).toEqualTypeOf<{tenantId: number}>()
        expectTypeOf(ctx.find).toEqualTypeOf<
          <T>(model: import('../src/types').ModelDefinition<any, any, T>) => T
        >()

        return {
          name: ctx.helpers.faker.name,
          id: ctx.helpers.id,
          tenantId: ctx.shared.tenantId,
        }
      })

      expectTypeOf(model.factory).toMatchTypeOf<(ctx: any) => any>()
    })
  })

  describe('Model Transforms', () => {
    it('should properly type model data and transform results', () => {
      class User {
        constructor(public data: {name: string; id: number}) {}
      }

      const context = faux.defineContext({
        helpers: {
          name: () => 'TestUser',
          id: () => 1,
        }
      })

      const model = context.defineModel(
        (ctx) => ({
          name: ctx.helpers.name,
          id: ctx.helpers.id,
        }),
        (data) => {
          expectTypeOf(data).toEqualTypeOf<{name: string; id: number}>()
          return new User(data)
        }
      )

      expectTypeOf(model.transform).toEqualTypeOf<
        ((data: {name: string; id: number}) => User) | undefined
      >()
    })

    it('should handle models without transforms', () => {
      const context = faux.defineContext({
        helpers: {
          value: () => 'test',
        }
      })

      const model = context.defineModel((ctx) => ({
        value: ctx.helpers.value,
      }))

    })
  })

  describe('Fixture Types', () => {
    it('should properly type fixture results', () => {
      class User {
        constructor(public name: string, public id: number) {}
      }

      const context = faux.defineContext({
        helpers: {
          name: () => 'TestUser',
          id: () => 1,
        }
      })

      const userModel = context.defineModel(
        (ctx) => ({
          name: ctx.helpers.name,
          id: ctx.helpers.id,
        }),
        (data) => new User(data.name, data.id)
      )

      const addressModel = context.defineModel((ctx) => ({
        street: '123 Main St',
        city: 'TestCity',
      }))

      const fixtures = context.defineFixtures({
        user: userModel,
        address: addressModel,
      })

      const f = fixtures()

      expectTypeOf(f.user).toEqualTypeOf<User>()
      expectTypeOf(f.address).toEqualTypeOf<{street: string; city: string}>()
      expectTypeOf(f.reset).toEqualTypeOf<(modelName?: 'user' | 'address') => void>
    })

    it('should properly type fixture overrides', () => {
      const context = faux.defineContext({
        helpers: {
          name: () => 'TestUser',
          id: () => 1,
        }
      })

      const userModel = context.defineModel((ctx) => ({
        name: ctx.helpers.name,
        id: ctx.helpers.id,
        active: true,
      }))

      const fixtures = context.defineFixtures({
        user: userModel,
      })

      const f = fixtures({
        override: {
          user: {
            name: 'CustomUser',
          }
        }
      })

      expectTypeOf(f.user).toEqualTypeOf<{name: string; id: number; active: boolean}>()
    })
  })

  describe('Complex Dependency Types', () => {
    it('should properly type models with dependencies', () => {
      const context = faux.defineContext({
        helpers: {
          id: (ctx) => ctx.getCursor(),
          name: (ctx) => `Item${ctx.seed}`,
        },
        shared: (ctx) => ({
          tenantId: ctx.helpers.id,
        })
      })

      const tenant = context.defineModel((ctx) => ({
        id: ctx.shared.tenantId,
        name: `Tenant ${ctx.shared.tenantId}`,
      }))

      const user = context.defineModel((ctx) => {
        const tenantData = ctx.find(tenant)

        expectTypeOf(tenantData).toEqualTypeOf<{id: number; name: string}>()

        return {
          id: ctx.helpers.id,
          name: ctx.helpers.name,
          tenantId: tenantData.id,
        }
      })

      const fixtures = context.defineFixtures({
        tenant,
        user,
      })

      const f = fixtures()

      expectTypeOf(f.tenant).toEqualTypeOf<{id: number; name: string}>()
      expectTypeOf(f.user).toEqualTypeOf<{id: number; name: string; tenantId: number}>()
    })
  })

  describe('Edge Cases', () => {
    it('should handle optional properties correctly', () => {
      const context = faux.defineContext({
        helpers: {
          optional: (): string | undefined => Math.random() > 0.5 ? 'value' : undefined,
          required: () => 'always',
        }
      })

      const model = context.defineModel((ctx) => ({
        optional: ctx.helpers.optional,
        required: ctx.helpers.required,
      }))

      expectTypeOf(model.factory).parameter(0).toMatchTypeOf<{
        helpers: {
          optional: string | undefined
          required: string
        }
      }>()
    })

    it('should handle complex generic types', () => {
      interface CustomData<T> {
        value: T
        metadata: {type: string}
      }

      const context = faux.defineContext({
        helpers: {
          stringData: (): CustomData<string> => ({
            value: 'test',
            metadata: {type: 'string'}
          }),
          numberData: (): CustomData<number> => ({
            value: 42,
            metadata: {type: 'number'}
          }),
        }
      })

      const model = context.defineModel((ctx) => {
        expectTypeOf(ctx.helpers.stringData).toEqualTypeOf<CustomData<string>>()
        expectTypeOf(ctx.helpers.numberData).toEqualTypeOf<CustomData<number>>()

        return {
          str: ctx.helpers.stringData,
          num: ctx.helpers.numberData,
        }
      })

      expectTypeOf(model).toMatchTypeOf<any>()
    })
  })

  describe('Shared Override Types', () => {
    it('should properly type shared overrides with type safety', () => {
      const context = faux.defineContext({
        helpers: {
          id: (ctx) => ctx.getCursor(),
          name: () => 'default-name' as const,
        },
        shared: (ctx) => ({
          tenantId: ctx.helpers.id,
          globalName: ctx.helpers.name,
          computed: `tenant-${ctx.helpers.id}`,
        })
      })

      const userModel = context.defineModel((ctx) => ({
        tenantId: ctx.shared.tenantId,
        name: ctx.shared.globalName,
      }))

      const fixtures = context.defineFixtures({
        user: userModel,
      })

      const f1 = fixtures({
        override: {
          shared: {
            tenantId: 999,
            globalName: 'custom-name' as 'default-name',
            computed: 'invalid',
            // @ts-expect-error - This should cause a type error because computed should be a template literal
            fake: ''
          }
        }
      })

      const f2 = fixtures({
        override: {
          shared: {
            tenantId: 777,
          }
        }
      })

      const f3 = fixtures({
        override: {
          shared: {}
        }
      })

      expectTypeOf(f1.user).toEqualTypeOf<{tenantId: number; name: 'default-name'}>()
      expectTypeOf(f2.user).toEqualTypeOf<{tenantId: number; name: 'default-name'}>()
      expectTypeOf(f3.user).toEqualTypeOf<{tenantId: number; name: 'default-name'}>()
    })

    it('should handle context without shared state', () => {
      const context = faux.defineContext({
        helpers: {
          id: () => 1,
        }
      })

      const userModel = context.defineModel((ctx) => ({
        id: ctx.helpers.id,
      }))

      const fixtures = context.defineFixtures({
        user: userModel,
      })

      const f = fixtures({
        override: {
          shared: {}
        }
      })

      expectTypeOf(f.user).toEqualTypeOf<{id: number}>()
    })

    it('should support combined model and shared overrides', () => {
      const context = faux.defineContext({
        helpers: {
          id: (ctx) => ctx.getCursor(),
          name: () => 'default',
        },
        shared: (ctx) => ({
          tenantId: ctx.helpers.id,
        })
      })

      const userModel = context.defineModel((ctx) => ({
        id: ctx.helpers.id,
        name: ctx.helpers.name,
        tenantId: ctx.shared.tenantId,
      }))

      const fixtures = context.defineFixtures({
        user: userModel,
      })

      const f = fixtures({
        override: {
          user: {
            name: 'custom-user-name',
          },
          shared: {
            tenantId: 888,
          }
        }
      })

      expectTypeOf(f.user).toEqualTypeOf<{id: number; name: string; tenantId: number}>()
    })

    it('should enforce proper shared override types', () => {
      const context = faux.defineContext({
        helpers: {
          id: (ctx) => ctx.getCursor(),
        },
        shared: (ctx) => ({
          tenantId: ctx.helpers.id,
          isActive: true,
          metadata: {type: 'default'}
        })
      })

      const userModel = context.defineModel((ctx) => ({
        tenantId: ctx.shared.tenantId,
        active: ctx.shared.isActive,
      }))

      const fixtures = context.defineFixtures({
        user: userModel,
      })

      const f = fixtures({
        override: {
          shared: {
            tenantId: 123,
            isActive: false,
            metadata: {type: 'custom' as 'default'},
          }
        }
      })

      expectTypeOf(f.user).toEqualTypeOf<{tenantId: number; active: boolean}>()
    })
  })
})
