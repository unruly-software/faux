import {describe, it, expect} from 'vitest'
import {faux} from '../src'

const context = faux.defineContext({
  helpers: {
    uuid: ({seed}) => `uuid-${seed}`,
  },
  shared: ({helpers}) => ({
    tenantId: helpers.uuid,
  }),
})

const user = context.defineModel((ctx) => ({
  id: ctx.helpers.uuid,
  name: 'DefaultName',
  tenantId: ctx.shared.tenantId,
  address: {
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
  },
}))

const tenant = context.defineModel((ctx) => ({
  id: ctx.shared.tenantId,
  name: 'DefaultTenant',
  settings: {
    billing: true,
    plan: 'basic' as 'basic' | 'premium',
    features: ['a', 'b'],
  },
}))

const fixtures = context.defineFixtures({user, tenant})

describe('function overrides', () => {
  it('should accept a function override for deep nested merge', () => {
    const f = fixtures({
      seed: 1,
      override: {
        user: (initial, ctx) => ({
          address: {...initial.address, city: 'Portland'},
        }),
      },
    })

    expect(f.user).toEqual({
      id: 'uuid-1',
      name: 'DefaultName',
      tenantId: 'uuid-1',
      address: {
        street: '123 Main St',
        city: 'Portland',
        state: 'IL',
      },
    })
  })

  it('should pass the model context as the second argument', () => {
    const f = fixtures({
      seed: 42,
      override: {
        user: (_initial, ctx) => ({
          name: `seed-${ctx.seed}`,
          tenantId: ctx.shared.tenantId,
        }),
      },
    })

    expect(f.user.name).toBe('seed-42')
    expect(f.user.tenantId).toBe('uuid-42')
  })

  it('should shallow-merge function return like object overrides', () => {
    const f = fixtures({
      seed: 1,
      override: {
        user: () => ({name: 'Overridden'}),
      },
    })

    expect(f.user.name).toBe('Overridden')
    expect(f.user.id).toBe('uuid-1')
    expect(f.user.address).toEqual({
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
    })
  })

  it('should still support plain object overrides', () => {
    const f = fixtures({
      seed: 1,
      override: {
        user: {name: 'PlainOverride'},
      },
    })

    expect(f.user.name).toBe('PlainOverride')
    expect(f.user.id).toBe('uuid-1')
  })

  it('should allow function override to use find via context', () => {
    const f = fixtures({
      seed: 1,
      override: {
        user: (_initial, ctx) => ({
          name: `tenant:${ctx.find(tenant).id}`,
        }),
      },
    })

    expect(f.user.name).toBe('tenant:uuid-1')
  })

  it('should expose helpers on the fixture result', () => {
    const f = fixtures({seed: 5})

    expect(f.helpers.uuid).toBe('uuid-5')
  })
})

describe('function overrides with named cases', () => {
  const cases = fixtures.defineNamedCases({
    admin: {
      seed: 10,
      override: {
        user: {name: 'Admin'},
        tenant: (initial) => ({
          settings: {...initial.settings, plan: 'premium'},
        }),
      },
    },
    basic: {
      seed: 20,
      override: {
        user: (initial) => ({
          address: {...initial.address, city: 'BasicCity'},
        }),
      },
    },
  })

  it('should support function overrides in named cases', () => {
    const f = cases.use('admin')

    expect(f.tenant.settings).toEqual({
      billing: true,
      plan: 'premium',
      features: ['a', 'b'],
    })
    expect(f.user.name).toBe('Admin')
  })

  it('should compose function overrides from case with additional overrides', () => {
    const f = cases.use('basic', {
      override: {
        user: (initial) => ({
          address: {...initial.address, state: 'OR'},
        }),
      },
    })

    // Case override set city to BasicCity, additional override sets state to OR
    expect(f.user.address).toEqual({
      street: '123 Main St',
      city: 'BasicCity',
      state: 'OR',
    })
  })

  it('should compose object defaults with function case overrides', () => {
    const casesWithDefaults = fixtures.defineNamedCases(
      {
        custom: {
          override: {
            user: (initial) => ({
              address: {...initial.address, city: 'CustomCity'},
            }),
          },
        },
      },
      {
        override: {
          user: {name: 'DefaultName-Override'},
        },
      },
    )

    const f = casesWithDefaults.use('custom')

    // Default object override sets name, case function override sets city
    expect(f.user.name).toBe('DefaultName-Override')
    expect(f.user.address.city).toBe('CustomCity')
  })

  it('should compose function defaults with object case overrides', () => {
    const casesWithFnDefaults = fixtures.defineNamedCases(
      {
        custom: {
          override: {
            user: {name: 'CaseOverride'},
          },
        },
      },
      {
        override: {
          user: (initial) => ({
            address: {...initial.address, city: 'DefaultCity'},
          }),
        },
      },
    )

    const f = casesWithFnDefaults.use('custom')

    // Default function sets city, case object override sets name
    expect(f.user.address.city).toBe('DefaultCity')
    expect(f.user.name).toBe('CaseOverride')
  })

  it('should compose function defaults with function case overrides', () => {
    const casesChained = fixtures.defineNamedCases(
      {
        custom: {
          override: {
            user: (initial) => ({
              address: {...initial.address, state: 'CA'},
            }),
          },
        },
      },
      {
        override: {
          user: (initial) => ({
            address: {...initial.address, city: 'DefaultCity'},
          }),
        },
      },
    )

    const f = casesChained.use('custom')

    // Default function sets city, case function sees city already set and adds state
    expect(f.user.address).toEqual({
      street: '123 Main St',
      city: 'DefaultCity',
      state: 'CA',
    })
  })
})
