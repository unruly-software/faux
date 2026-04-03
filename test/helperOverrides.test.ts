import {describe, it, expect} from 'vitest'
import {faux} from '../src'

const faker = (seed: number) => ({
  name: `TestUser${seed}`,
  company: {
    name: `TestCompany${seed}`
  }
})

const v4 = ({random}: {random: Uint8Array}) => {
  return `uuid-${Array.from(random).join('')}`
}

describe('Helper Overrides', () => {
  it('should allow partial helper overrides', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
        uuid: ({seed}) => `uuid-${seed}`,
        now: () => new Date(2024, 0, 1)
      },
      shared: ({helpers}) => ({
        tenantId: helpers.uuid,
        timestamp: helpers.now
      })
    })

    const user = context.defineModel((ctx) => ({
      id: ctx.helpers.uuid,
      name: ctx.helpers.faker.name,
      tenantId: ctx.shared.tenantId,
      createdAt: ctx.helpers.now
    }))

    const fixtures = context.defineFixtures({user})


    const f = fixtures({
      seed: 100,
      override: {
        helpers: {
          faker: () => ({name: 'CustomUser', company: {name: 'CustomCompany'}}),
          now: () => new Date(2025, 5, 15)

        }
      }
    })

    expect(f.user.id).toBe('uuid-100')
    expect(f.user.name).toBe('CustomUser')
    expect(f.user.tenantId).toBe('uuid-100')
    expect(f.user.createdAt).toEqual(new Date(2025, 5, 15))
  })

  it('should work with shared values computed from overridden helpers', () => {
    const context = faux.defineContext({
      helpers: {
        uuid: ({seed}) => `uuid-${seed}`,
        timestamp: () => new Date(2024, 0, 1)
      },
      shared: ({helpers}) => ({
        tenantId: helpers.uuid,
        createdAt: helpers.timestamp
      })
    })

    const user = context.defineModel((ctx) => ({
      tenantId: ctx.shared.tenantId,
      createdAt: ctx.shared.createdAt
    }))

    const fixtures = context.defineFixtures({user})

    const f = fixtures({
      seed: 200,
      override: {
        helpers: {
          uuid: () => 'custom-tenant-id',
          timestamp: () => new Date(2025, 11, 31)
        }
      }
    })

    expect(f.user.tenantId).toBe('custom-tenant-id')
    expect(f.user.createdAt).toEqual(new Date(2025, 11, 31))
    expect(f.shared.tenantId).toBe('custom-tenant-id')
    expect(f.shared.createdAt).toEqual(new Date(2025, 11, 31))
  })

  it('should maintain helper override isolation between fixtures', () => {
    const context = faux.defineContext({
      helpers: {
        value: ({seed}) => seed
      }
    })

    const model = context.defineModel((ctx) => ({
      value: ctx.helpers.value
    }))

    const fixtures = context.defineFixtures({model})

    const f1 = fixtures({
      seed: 1,
      override: {
        helpers: {
          value: () => 999
        }
      }
    })

    const f2 = fixtures({seed: 1})

    expect(f1.model.value).toBe(999)
    expect(f2.model.value).toBe(1)
  })

  it('should work with named cases', () => {
    const context = faux.defineContext({
      helpers: {
        status: ({seed}) => seed % 2 === 0 ? 'active' : 'inactive',
        role: () => 'user'
      }
    })

    const user = context.defineModel((ctx) => ({
      status: ctx.helpers.status,
      role: ctx.helpers.role
    }))

    const fixtures = context.defineFixtures({user})

    const scenarios = fixtures.defineNamedCases({
      admin: {
        override: {
          helpers: {
            role: () => 'admin'
          }
        }
      },
      inactive: {
        override: {
          helpers: {
            status: () => 'inactive'
          }
        }
      }
    })

    const adminUser = scenarios.use('admin', {seed: 100})
    const inactiveUser = scenarios.use('inactive', {seed: 100})
    const regularUser = fixtures({seed: 100})

    expect(adminUser.user.role).toBe('admin')
    expect(adminUser.user.status).toBe('active')

    expect(inactiveUser.user.status).toBe('inactive')
    expect(inactiveUser.user.role).toBe('user')

    expect(regularUser.user.role).toBe('user')
    expect(regularUser.user.status).toBe('active')
  })

  it('should merge helper overrides in named cases', () => {
    const context = faux.defineContext({
      helpers: {
        name: () => 'DefaultName',
        email: () => 'default@example.com',
        role: () => 'user'
      }
    })

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.name,
      email: ctx.helpers.email,
      role: ctx.helpers.role
    }))

    const fixtures = context.defineFixtures({user})

    const scenarios = fixtures.defineNamedCases({
      testCase: {
        override: {
          helpers: {
            name: () => 'CaseName',
            role: () => 'admin'
          }
        }
      }
    })

    const f = scenarios.use('testCase', {
      override: {
        helpers: {
          email: () => 'override@example.com'
          // name and role come from case, email is additional override
        }
      }
    })

    expect(f.user.name).toBe('CaseName')
    expect(f.user.role).toBe('admin')
    expect(f.user.email).toBe('override@example.com')
  })

  it('should give precedence to additional options over case options for helpers', () => {
    const context = faux.defineContext({
      helpers: {
        value: () => 'original'
      }
    })

    const model = context.defineModel((ctx) => ({
      value: ctx.helpers.value
    }))

    const fixtures = context.defineFixtures({model})

    const scenarios = fixtures.defineNamedCases({
      testCase: {
        override: {
          helpers: {
            value: () => 'from-case'
          }
        }
      }
    })

    const f = scenarios.use('testCase', {
      override: {
        helpers: {
          value: () => 'from-additional'
        }
      }
    })

    expect(f.model.value).toBe('from-additional')
  })

  it('should handle complex helper values', () => {
    const context = faux.defineContext({
      helpers: {
        complexObject: ({seed}) => ({
          nested: {
            value: seed,
            array: [1, 2, 3]
          },
          fn: () => 'function-result'
        }),
        functionHelper: ({seed}) => (x: number) => x + seed
      }
    })

    const model = context.defineModel((ctx) => ({
      complex: ctx.helpers.complexObject,
      fn: ctx.helpers.functionHelper
    }))

    const fixtures = context.defineFixtures({model})

    const customObject = {
      nested: {
        value: 999,
        array: [4, 5, 6]
      },
      fn: () => 'custom-result' as const
    }

    const f = fixtures({
      seed: 10,
      override: {
        helpers: {
          complexObject: () => customObject as any,
          functionHelper: () => (x: number) => x * 2
        }
      }
    })

    expect(f.model.complex).toBe(customObject)
    expect(f.model.complex.nested.value).toBe(999)
    expect(f.model.complex.fn()).toBe('custom-result')
    expect(f.model.fn(5)).toBe(10)
  })

  it('should maintain deterministic behavior with helper overrides', () => {
    const context = faux.defineContext({
      helpers: {
        random: ({getCursor}) => getCursor(),
        value: ({seed}) => seed
      }
    })

    const model = context.defineModel((ctx) => ({
      random: ctx.helpers.random,
      value: ctx.helpers.value,
      anotherRandom: ctx.getCursor()
    }))

    const fixtures = context.defineFixtures({model})

    const f1 = fixtures({
      seed: 42,
      override: {
        helpers: {
          value: () => 100
        }
      }
    })

    const f2 = fixtures({
      seed: 42,
      override: {
        helpers: {
          value: () => 100
        }
      }
    })

    expect(f1.model).toEqual(f2.model)
    expect(f1.model.random).toBeGreaterThan(0)
    expect(f1.model.value).toBe(100)
    expect(f1.model.anotherRandom).toBeGreaterThan(0)
  })

  it('should work without helper overrides (backward compatibility)', () => {
    const context = faux.defineContext({
      helpers: {
        name: ({seed}) => `User${seed}`,
        uuid: ({seed}) => `uuid-${seed}`
      }
    })

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.name,
      id: ctx.helpers.uuid
    }))

    const fixtures = context.defineFixtures({user})


    const f = fixtures({seed: 50})

    expect(f.user.name).toBe('User50')
    expect(f.user.id).toBe('uuid-50')
  })
})
