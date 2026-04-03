import {describe, it, expect, vi} from 'vitest'
import {faux} from '../src'

const context = faux.defineContext({
  helpers: {
    uuid: ({seed}) => `uuid-${seed}`,
    faker: ({seed}) => ({
      person: {firstName: () => `User${seed}`},
      company: {name: () => `Company${seed}`}
    })
  },
  shared: ({helpers}) => ({
    tenantId: helpers.uuid,
    timestamp: new Date('2024-01-01')
  })
})

const user = context.defineModel(ctx => ({
  id: ctx.helpers.uuid,
  name: ctx.helpers.faker.person.firstName(),
  tenantId: ctx.shared.tenantId,
  role: 'user' as 'user' | 'admin',
  active: true
}))

const tenant = context.defineModel(ctx => ({
  id: ctx.shared.tenantId,
  name: ctx.helpers.faker.company.name(),
  billing: true,
  planType: 'basic' as 'basic' | 'premium'
}))

const useFixtures = context.defineFixtures({user, tenant})

describe('Named Cases', () => {

  describe('defineNamedCases', () => {

    it('should include all case names', () => {
      const scenarios = useFixtures.defineNamedCases({
        scenario1: {},
        scenario2: {},
        scenario3: {}
      })

      const caseNames = scenarios.forEach({}, (name) => name)
      expect(caseNames).toEqual(['scenario1', 'scenario2', 'scenario3'])
    })
  })

  describe('use method', () => {
    it('should create fixtures with case configuration', () => {
      const scenarios = useFixtures.defineNamedCases({
        adminUser: {
          seed: 100,
          override: {
            user: {role: 'admin', active: true},
            tenant: {billing: false}
          }
        },
        basicUser: {
          seed: 200,
          override: {user: {role: 'user'}}
        }
      })

      const adminFixtures = scenarios.use('adminUser')
      expect(adminFixtures.user).toMatchObject({
        id: 'uuid-100',
        name: 'User100',
        role: 'admin',
        active: true
      })
      expect(adminFixtures.tenant).toMatchObject({
        billing: false
      })

      const basicFixtures = scenarios.use('basicUser')
      expect(basicFixtures.user).toMatchObject({
        id: 'uuid-200',
        name: 'User200',
        role: 'user'
      })
    })

    it('should merge additional options with case configuration', () => {
      const scenarios = useFixtures.defineNamedCases({
        testCase: {
          seed: 50,
          override: {
            user: {role: 'admin'},
            tenant: {billing: true}
          }
        }
      })

      const f = scenarios.use('testCase', {
        override: {
          user: {name: 'CustomName', active: false},
          tenant: {planType: 'premium'}
        }
      })

      expect(f.user).toMatchObject({
        role: 'admin',
        name: 'CustomName',
        active: false
      })
      expect(f.tenant).toMatchObject({
        billing: true,
        planType: 'premium'
      })
    })

    it('should give precedence to additional options over case options', () => {
      const scenarios = useFixtures.defineNamedCases({
        testCase: {
          seed: 100,
          override: {
            user: {role: 'user', active: true}
          }
        }
      })

      const f = scenarios.use('testCase', {
        seed: 500,
        override: {
          user: {role: 'admin', active: false}
        }
      })

      expect(f.user).toMatchObject({
        id: 'uuid-500',
        role: 'admin',
        active: false
      })
    })

    it('should work with shared state overrides', () => {
      const scenarios = useFixtures.defineNamedCases({
        customTenant: {
          override: {
            shared: {tenantId: 'custom-tenant-123'}
          }
        }
      })

      const f = scenarios.use('customTenant')
      expect(f.user.tenantId).toBe('custom-tenant-123')
      expect(f.tenant.id).toBe('custom-tenant-123')
    })

    it('should handle defaults configuration', () => {
      const scenarios = useFixtures.defineNamedCases({
        case1: {
          override: {user: {role: 'user'}}
        },
        case2: {
          override: {user: {role: 'admin'}}
        }
      }, {
        seed: 1000,
        cursorIncrease: 5000
      })

      const f1 = scenarios.use('case1')
      const f2 = scenarios.use('case2')

      expect(f1.user.id).toBe('uuid-1000')
      expect(f1.tenant.id).toBe('uuid-1000')

      expect(f2.user.id).toBe('uuid-1000')
      expect(f2.tenant.id).toBe('uuid-1000')
    })

    it('should throw error for nonexistent case', () => {
      const scenarios = useFixtures.defineNamedCases({
        validCase: {}
      })

      expect(() => scenarios.use('invalidCase' as any)).toThrowErrorMatchingInlineSnapshot(
        `"Case 'invalidCase' not found. Available cases: [validCase]"`
      )
    })
  })

  describe('forEach method', () => {
    it('should iterate over all cases by default', () => {
      const scenarios = useFixtures.defineNamedCases({
        case1: {seed: 100},
        case2: {seed: 200},
        case3: {seed: 300}
      })

      const results: Array<{name: string, userId: string}> = []

      scenarios.forEach({}, (name, fixtures) => {
        results.push({
          name: name as string,
          userId: fixtures.user.id
        })
      })

      expect(results).toHaveLength(3)
      expect(results).toEqual([
        {name: 'case1', userId: 'uuid-100'},
        {name: 'case2', userId: 'uuid-200'},
        {name: 'case3', userId: 'uuid-300'}
      ])
    })

    it('should skip specified cases', () => {
      const scenarios = useFixtures.defineNamedCases({
        case1: {seed: 100},
        case2: {seed: 200},
        case3: {seed: 300}
      })

      const results: string[] = []

      scenarios.forEach({skip: ['case2']}, (name) => {
        results.push(name as string)
      })

      expect(results).toEqual(['case1', 'case3'])
    })

    it('should only run specified cases when using only', () => {
      const scenarios = useFixtures.defineNamedCases({
        case1: {seed: 100},
        case2: {seed: 200},
        case3: {seed: 300},
        case4: {seed: 400}
      })

      const results: string[] = []

      scenarios.forEach({only: ['case2', 'case4']}, (name) => {
        results.push(name as string)
      })

      expect(results).toEqual(['case2', 'case4'])
    })

    it('should apply both skip and only', () => {
      const scenarios = useFixtures.defineNamedCases({
        case1: {seed: 100, },
        case2: {seed: 200},
        case3: {seed: 300}
      })


      const results = scenarios.forEach({
        only: ['case1', 'case2'],
        skip: ['case1']
      }, (name) => {
        return name
      })

      expect(results).toEqual(['case2'])
    })

    it('should handle empty arrays correctly', () => {
      const scenarios = useFixtures.defineNamedCases({
        case1: {seed: 100},
        case2: {seed: 200}
      })

      const results: string[] = []

      scenarios.forEach({skip: []}, (name) => {
        results.push(name as string)
      })

      expect(results).toEqual(['case1', 'case2'])

      const results2: string[] = []

      scenarios.forEach({only: []}, (name) => {
        results2.push(name as string)
      })
      expect(results2).toEqual([])
    })
  })

  describe('integration with vitest', () => {
    it('should work well with describe.each pattern', () => {
      const scenarios = useFixtures.defineNamedCases({
        regularUser: {
          override: {user: {role: 'user'}}
        },
        adminUser: {
          override: {user: {role: 'admin'}}
        },
        inactiveUser: {
          override: {user: {active: false}}
        }
      })

      const testCases: Array<{name: string, expectedRole: string, expectedActive: boolean}> = []

      scenarios.forEach({}, (name, fixtures) => {
        testCases.push({
          name: name as string,
          expectedRole: fixtures.user.role,
          expectedActive: fixtures.user.active
        })
      })

      expect(testCases).toEqual([
        {name: 'regularUser', expectedRole: 'user', expectedActive: true},
        {name: 'adminUser', expectedRole: 'admin', expectedActive: true},
        {name: 'inactiveUser', expectedRole: 'user', expectedActive: false}
      ])
    })

    it('should be usable in dynamic test generation', () => {
      const scenarios = useFixtures.defineNamedCases({
        scenario1: {seed: 1},
        scenario2: {seed: 2}
      })

      const testSpecs: Array<{name: string, spec: () => void}> = []

      scenarios.forEach({}, (name, fixtures) => {
        testSpecs.push({
          name: name as string,
          spec: () => {
            expect(fixtures.user).toBeDefined()
            expect(fixtures.tenant).toBeDefined()
            expect(typeof fixtures.user.id).toBe('string')
          }
        })
      })

      testSpecs.forEach(({name, spec}) => {
        spec()
      })

      expect(testSpecs).toHaveLength(2)
    })
  })

  describe('type safety', () => {
    it('should provide proper TypeScript inference', () => {
      const scenarios = useFixtures.defineNamedCases({
        testCase: {
          override: {
            user: {role: 'admin' as const},
            tenant: {planType: 'premium' as const}
          }
        }
      })

      const f = scenarios.use('testCase')

      expect(f.user.role).toBe('admin')
      expect(f.tenant.planType).toBe('premium')
      expect(typeof f.user.active).toBe('boolean')
      expect(typeof f.tenant.billing).toBe('boolean')
    })
  })
})

describe('Named cases - direct use', () => {
  it('should allow direct use of named cases without forEach', () => {
    const useNamedFixtures = useFixtures.defineNamedCases({
      directCase: {
        override: {
          user: {role: 'admin', active: false},
        }
      }
    })

    const fixture = useNamedFixtures.use('directCase', {
      cursorIncrease: 100
    })



  })

  it('should throw if the named case does not exist', () => {
    const useNamedFixtures = useFixtures.defineNamedCases({
      directCase: undefined as any
    })

    expect(() => useNamedFixtures.use('directCase' as any)).toThrowErrorMatchingInlineSnapshot('"Case \'directCase\' not found. Available cases: [directCase]"')
    expect(() => useNamedFixtures.forEach({}, () => {})).toThrowErrorMatchingInlineSnapshot('"Case \'directCase\' not found. Available cases: [directCase]"')
  })

  it('should merge shared overrides', () => {
    const useNamedFixtures = useFixtures.defineNamedCases({
      sharedOverrideCase: {
        override: {
          shared: {tenantId: 'overridden-tenant-id'}
        }
      }
    })

    const fixture = useNamedFixtures.use('sharedOverrideCase', {
      override: {
        shared: {tenantId: 'overridden-tenant-id-2'}
      }
    })

    expect(fixture.user.tenantId).toBe('overridden-tenant-id-2')
    expect(fixture.tenant.id).toBe('overridden-tenant-id-2')
  })


})
