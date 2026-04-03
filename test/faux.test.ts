import {describe, it, expect} from 'vitest'
import {faux} from '../src'

class User {
  constructor(public data: {name: string; userId: string; tenantId: string; userNumber: number; birthday: any}) {}

  static create(data: {name: string; userId: string; tenantId: string; userNumber: number; birthday: any}) {
    return new User(data)
  }
}

class Tenant {
  constructor(public data: {tenantId: string; name: string}) {}

  static create(data: {tenantId: string; name: string}) {
    return new Tenant(data)
  }
}

const faker = (seed: number) => ({
  name: `TestUser${seed}`,
  company: {
    name: `TestCompany${seed}`
  }
})

const v4 = ({random}: {random: Uint8Array}) => {
  return `uuid-${Array.from(random).join('')}`
}

describe('@unruly-software/faux', () => {
  it('should create context with helpers and shared state', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
        now: () => new Date(2024, 0, 1),
        uuid: ({seed}) => v4({
          random: Uint8Array.from(
            (++seed)
              .toString()
              .padStart(16, '0')
              .split('')
              .map((v) => Number(v)),
          ),
        })
      },
      shared: ({helpers}) => ({
        tenantId: helpers.uuid,
      })
    })

    expect(context).toMatchInlineSnapshot(`
      {
        "config": {
          "helpers": {
            "faker": [Function],
            "now": [Function],
            "uuid": [Function],
          },
          "shared": [Function],
        },
        "defineFixtures": [Function],
        "defineModel": [Function],
      }
    `)
    expect(context.config.helpers).toMatchInlineSnapshot(`
      {
        "faker": [Function],
        "now": [Function],
        "uuid": [Function],
      }
    `)
    expect(context.config.shared).toMatchInlineSnapshot('[Function]')
  })

  it('should create models with context access', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
        uuid: ({seed}) => `uuid-${seed}`
      },
      shared: ({helpers}) => ({
        tenantId: helpers.uuid,
      })
    })

    const birthday = context.defineModel((ctx) => ({
      day: 1,
      month: 0,
      year: 1990
    }))

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.faker.name,
      userId: ctx.helpers.uuid,
      tenantId: ctx.shared.tenantId,
      userNumber: ctx.seed,
      birthday: ctx.find(birthday),
    }), data => User.create(data))

    expect(birthday).toMatchInlineSnapshot(`
      {
        "factory": [Function],
        "transform": undefined,
      }
    `)
    expect(user).toMatchInlineSnapshot(`
      {
        "factory": [Function],
        "transform": [Function],
      }
    `)
    expect(birthday).not.toBe(user)
    expect(typeof birthday.factory).toBe('function')
    expect(typeof user.factory).toBe('function')
  })

  it('should create fixtures and resolve models', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
        uuid: ({seed}) => `uuid-${seed}`
      },
      shared: ({helpers}) => ({
        tenantId: helpers.uuid,
      })
    })

    const birthday = context.defineModel((ctx) => ({
      day: 1,
      month: 0,
      year: 1990
    }))

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.faker.name,
      userId: ctx.helpers.uuid,
      tenantId: ctx.shared.tenantId,
      userNumber: ctx.seed,
      birthday: ctx.find(birthday),
    }), data => User.create(data))

    const tenant = context.defineModel((ctx) => ({
      tenantId: ctx.shared.tenantId,
      name: ctx.helpers.faker.company.name,
    }), data => Tenant.create(data))

    const fixtures = context.defineFixtures({
      user,
      tenant,
      birthday,
    })

    const f = fixtures({seed: 500})

    expect(f.user).toBeInstanceOf(User)
    expect(f.tenant).toBeInstanceOf(Tenant)
    expect(f.user).toMatchInlineSnapshot(`
      User {
        "data": {
          "birthday": {
            "day": 1,
            "month": 0,
            "year": 1990,
          },
          "name": "TestUser500",
          "tenantId": "uuid-500",
          "userId": "uuid-500",
          "userNumber": 500,
        },
      }
    `)
    expect(f.tenant).toMatchInlineSnapshot(`
      Tenant {
        "data": {
          "name": "TestCompany500",
          "tenantId": "uuid-500",
        },
      }
    `)

    expect(f.user.data.tenantId).toBe(f.tenant.data.tenantId)
  })

  it('should support overrides', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
        uuid: ({seed}) => `uuid-${seed}`
      },
      shared: ({helpers}) => ({
        tenantId: helpers.uuid,
      })
    })

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.faker.name,
      userId: ctx.helpers.uuid,
      tenantId: ctx.shared.tenantId,
      userNumber: ctx.seed,
      birthday: null,
    }), data => User.create(data))

    const fixtures = context.defineFixtures({
      user,
    })

    const f = fixtures({
      seed: 1000,
      override: {
        user: {
          name: 'Spaghetti Monster'
        }
      }
    })

    expect(f.user).toMatchInlineSnapshot(`
      User {
        "data": {
          "birthday": null,
          "name": "Spaghetti Monster",
          "tenantId": "uuid-1000",
          "userId": "uuid-1000",
          "userNumber": 1000,
        },
      }
    `)
  })

  it('should support shared state overrides', () => {
    const context = faux.defineContext({
      helpers: {
        uuid: ({seed}) => `uuid-${seed}`
      },
      shared: ({helpers}) => ({
        tenantId: helpers.uuid,
      })
    })

    const user = context.defineModel((ctx) => ({
      tenantId: ctx.shared.tenantId,
    }))

    const fixtures = context.defineFixtures({
      user,
    })

    const f1 = fixtures({seed: 1})
    const f2 = fixtures({seed: 1, override: {shared: {tenantId: 'custom-tenant-id'}}})

    expect(f1.user).toMatchInlineSnapshot(`
      {
        "tenantId": "uuid-1",
      }
    `)
    expect(f2.user).toMatchInlineSnapshot(`
      {
        "tenantId": "custom-tenant-id",
      }
    `)
  })

  it('should produce deterministic results with same seed', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
        uuid: ({seed}) => `uuid-${seed}`
      }
    })

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.faker.name,
      userId: ctx.helpers.uuid,
      userNumber: ctx.seed,
    }))

    const fixtures = context.defineFixtures({
      user,
    })

    const f1 = fixtures({seed: 42})
    const f2 = fixtures({seed: 42})

    expect(f1.user).toMatchInlineSnapshot(`
      {
        "name": "TestUser42",
        "userId": "uuid-42",
        "userNumber": 42,
      }
    `)
    expect(f2.user).toMatchInlineSnapshot(`
      {
        "name": "TestUser42",
        "userId": "uuid-42",
        "userNumber": 42,
      }
    `)
  })

  it('should handle model dependencies correctly', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
      }
    })

    const address = context.defineModel((ctx) => ({
      street: `${ctx.seed} Main St`,
      city: ctx.helpers.faker.name + ' City'
    }))

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.faker.name,
      address: ctx.find(address)
    }))

    const fixtures = context.defineFixtures({
      user,
      address
    })

    const f = fixtures({seed: 123})

    expect(f.user).toMatchInlineSnapshot(`
      {
        "address": {
          "city": "TestUser123 City",
          "street": "123 Main St",
        },
        "name": "TestUser123",
      }
    `)
    expect(f.address).toMatchInlineSnapshot(`
      {
        "city": "TestUser123 City",
        "street": "123 Main St",
      }
    `)
    expect(f.user.address).toBe(f.address)
  })

  it('should provide seed-based getCursor functionality', () => {
    const context = faux.defineContext({
      helpers: {
        getCursorValue: ({getCursor}) => getCursor(),
        getMultipleCursors: ({getCursor}) => [getCursor(), getCursor(), getCursor()],
      }
    })

    const model = context.defineModel((ctx) => ({
      helperCursor: ctx.helpers.getCursorValue,
      multipleCursors: ctx.helpers.getMultipleCursors,
      modelCursor: ctx.getCursor(),
      anotherModelCursor: ctx.getCursor(),
    }))

    const fixtures = context.defineFixtures({
      model,
    })

    const f1 = fixtures({seed: 100})
    expect(f1.model).toMatchInlineSnapshot(`
      {
        "anotherModelCursor": 1105,
        "helperCursor": 1100,
        "modelCursor": 1104,
        "multipleCursors": [
          1101,
          1102,
          1103,
        ],
      }
    `)

    const f2 = fixtures({seed: 500})
    expect(f2.model).toMatchInlineSnapshot(`
      {
        "anotherModelCursor": 1505,
        "helperCursor": 1500,
        "modelCursor": 1504,
        "multipleCursors": [
          1501,
          1502,
          1503,
        ],
      }
    `)

    const f3 = fixtures({seed: 100})
    expect(f3.model).toMatchInlineSnapshot(`
      {
        "anotherModelCursor": 1105,
        "helperCursor": 1100,
        "modelCursor": 1104,
        "multipleCursors": [
          1101,
          1102,
          1103,
        ],
      }
    `)
  })

  it('should avoid collisions between different seeds', () => {
    const context = faux.defineContext({
      helpers: {
        uuid: ({getCursor}) => `uuid-${getCursor()}`,
      }
    })

    const user = context.defineModel((ctx) => ({
      id: ctx.helpers.uuid,
      userId: `user-${ctx.getCursor()}`,
    }))

    const fixtures = context.defineFixtures({
      user,
    })

    const f1a = fixtures({seed: 1})
    const f1b = fixtures({seed: 1})

    const f500 = fixtures({seed: 500})

    expect(f1a.user).toMatchInlineSnapshot(`
      {
        "id": "uuid-1001",
        "userId": "user-1002",
      }
    `)
    expect(f1b.user).toMatchInlineSnapshot(`
      {
        "id": "uuid-1001",
        "userId": "user-1002",
      }
    `)
    expect(f500.user).toMatchInlineSnapshot(`
      {
        "id": "uuid-1500",
        "userId": "user-1501",
      }
    `)

    expect(f1a.user.id).not.toBe(f500.user.id)
    expect(f1a.user.userId).not.toBe(f500.user.userId)
  })

  it('should provide isolated cursors per model with cursorIncrease', () => {
    const context = faux.defineContext({
      helpers: {
        helperCursor: ({getCursor}) => getCursor(),
        uuid: ({getCursor}) => `uuid-${getCursor()}`,
      }
    })

    const user = context.defineModel((ctx) => ({
      helperCursor: ctx.helpers.helperCursor,
      helperUuid: ctx.helpers.uuid,
      modelCursor: ctx.getCursor(),
      anotherModelCursor: ctx.getCursor(),
    }))

    const business = context.defineModel((ctx) => ({
      helperCursor: ctx.helpers.helperCursor,
      helperUuid: ctx.helpers.uuid,
      modelCursor: ctx.getCursor(),
      anotherModelCursor: ctx.getCursor(),
    }))

    const fixtures = context.defineFixtures({
      user,
      business,
    })

    const f = fixtures({seed: 1, cursorIncrease: 100})

    expect(f.user).toMatchInlineSnapshot(`
      {
        "anotherModelCursor": 104,
        "helperCursor": 101,
        "helperUuid": "uuid-102",
        "modelCursor": 103,
      }
    `)
    expect(f.business).toMatchInlineSnapshot(`
      {
        "anotherModelCursor": 204,
        "helperCursor": 201,
        "helperUuid": "uuid-202",
        "modelCursor": 203,
      }
    `)

    expect(f.user.helperCursor).not.toBe(f.business.helperCursor)
    expect(f.user.helperUuid).not.toBe(f.business.helperUuid)
    expect(f.user.modelCursor).not.toBe(f.business.modelCursor)
  })

  it('should handle multiple models with different cursorIncrease values', () => {
    const context = faux.defineContext({
      helpers: {
        uuid: ({getCursor}) => `uuid-${getCursor()}`,
      }
    })

    const user = context.defineModel((ctx) => ({
      id: ctx.helpers.uuid,
      cursor: ctx.getCursor(),
    }))

    const business = context.defineModel((ctx) => ({
      id: ctx.helpers.uuid,
      cursor: ctx.getCursor(),
    }))

    const address = context.defineModel((ctx) => ({
      id: ctx.helpers.uuid,
      cursor: ctx.getCursor(),
    }))

    const fixtures = context.defineFixtures({
      user,
      business,
      address,
    })

    const f = fixtures({seed: 10, cursorIncrease: 50})

    expect(f.user).toMatchInlineSnapshot(`
      {
        "cursor": 61,
        "id": "uuid-60",
      }
    `)
    expect(f.business).toMatchInlineSnapshot(`
      {
        "cursor": 111,
        "id": "uuid-110",
      }
    `)
    expect(f.address).toMatchInlineSnapshot(`
      {
        "cursor": 161,
        "id": "uuid-160",
      }
    `)
  })

  it('should use default cursorIncrease of 1000 when not specified', () => {
    const context = faux.defineContext({
      helpers: {
        uuid: ({getCursor}) => `uuid-${getCursor()}`,
      }
    })

    const user = context.defineModel((ctx) => ({
      id: ctx.helpers.uuid,
      cursor: ctx.getCursor(),
    }))

    const business = context.defineModel((ctx) => ({
      id: ctx.helpers.uuid,
      cursor: ctx.getCursor(),
    }))

    const fixtures = context.defineFixtures({
      user,
      business,
    })

    const f = fixtures({seed: 5})

    expect(f.user).toMatchInlineSnapshot(`
      {
        "cursor": 1006,
        "id": "uuid-1005",
      }
    `)
    expect(f.business).toMatchInlineSnapshot(`
      {
        "cursor": 2006,
        "id": "uuid-2005",
      }
    `)

    expect(f.user.id).toBe('uuid-1005')
    expect(f.user.cursor).toBe(1006)
    expect(f.business.id).toBe('uuid-2005')
    expect(f.business.cursor).toBe(2006)
  })

  it('should increase as expected with shared values created once', () => {
    const context = faux.defineContext({
      helpers: {
        myCursor: ({getCursor}): number => getCursor(),
      },
      shared: ({helpers}) => ({
        tenantId: `tenant-${helpers.myCursor}`
      })
    })

    const user = context.defineModel((ctx) => ({
      aShared: ctx.shared.tenantId,
      a: ctx.helpers.myCursor,
      b: ctx.getCursor(),
      c: ctx.helpers.myCursor,
      d: ctx.getCursor(),
      dShared: ctx.shared.tenantId,
    }))

    const fixtures = context.defineFixtures({
      user,
    })

    const {user: u} = fixtures({})

    expect(u.aShared).toBe('tenant-1')
    expect(u.dShared).toBe('tenant-1')
    expect(u.a).toBe(1001)
    expect(u.b).toBe(1002)
    expect(u.c).toBe(1003)
    expect(u.d).toBe(1004)
  })

  it('should support .reset() and .update() methods on fixtures', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
        uuid: ({seed}) => `uuid-${seed}`
      },
      shared: ({helpers}) => ({
        tenantId: helpers.uuid,
      })
    })

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.faker.name,
      userId: ctx.helpers.uuid,
      tenantId: ctx.shared.tenantId,
      userNumber: ctx.seed,
      birthday: null,
    }), data => User.create(data))

    const fixtures = context.defineFixtures({
      user,
    })

    const f = fixtures({seed: 100})

    const user1 = f.user
    const user2 = f.user
    expect(user1).toBe(user2)

    f.reset()
    const user3 = f.user
    expect(user1).not.toBe(user3)
    expect(user1.data.name).toBe(user3.data.name)

    const user4 = f.user
    expect(user3).toBe(user4)
    f.reset('user')
    const user5 = f.user
    expect(user4).not.toBe(user5)
    expect(user4.data.name).toBe(user5.data.name)
  })

  it('should support .update() method to replace cached values', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
      }
    })

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.faker.name,
      userId: 'test-user-id',
      tenantId: 'test-tenant-id',
      userNumber: ctx.seed,
      birthday: null,
    }), data => User.create(data))

    const fixtures = context.defineFixtures({
      user,
    })

    const f = fixtures({seed: 200})


    const originalUser = f.user
    expect(originalUser.data.name).toBe('TestUser200')


    const newUserData = {
      name: 'UpdatedUser',
      userId: 'updated-id',
      tenantId: 'updated-tenant',
      userNumber: 999,
      birthday: null,
    }
    const newUser = User.create(newUserData)
    f.update('user', newUser)


    const updatedUser = f.user
    expect(updatedUser).toBe(newUser)
    expect(updatedUser.data.name).toBe('UpdatedUser')
    expect(updatedUser.data.userNumber).toBe(999)


    const sameUpdatedUser = f.user
    expect(updatedUser).toBe(sameUpdatedUser)
  })

  it('should support .update() affecting both direct access and ctx.find()', () => {
    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
      }
    })

    const address = context.defineModel((ctx) => ({
      street: `${ctx.seed} Main St`,
      city: ctx.helpers.faker.name + ' City'
    }))

    const user = context.defineModel((ctx) => ({
      name: ctx.helpers.faker.name,
      address: ctx.find(address)
    }))

    const fixtures = context.defineFixtures({
      user,
      address
    })

    const f = fixtures({seed: 300})


    const originalUser = f.user
    const originalAddress = f.address
    expect(originalUser.address).toBe(originalAddress)


    const newAddress = {
      street: 'Updated Street',
      city: 'Updated City'
    }
    f.update('address', newAddress)


    expect(f.address).toBe(newAddress)


    f.reset('user')
    const newUser = f.user
    expect(newUser.address).toBe(newAddress)
  })

  it('should maintain lazy evaluation - unused models not resolved', () => {
    let userResolved = false
    let addressResolved = false

    const context = faux.defineContext({
      helpers: {
        faker: ({seed}) => faker(seed),
      }
    })

    const address = context.defineModel((ctx) => {
      addressResolved = true
      return {
        street: `${ctx.seed} Main St`,
        city: ctx.helpers.faker.name + ' City'
      }
    })

    const user = context.defineModel((ctx) => {
      userResolved = true
      return {
        name: ctx.helpers.faker.name,
      }
    })

    const fixtures = context.defineFixtures({
      user,
      address
    })

    const f = fixtures({seed: 400})


    expect(userResolved).toBe(false)
    expect(addressResolved).toBe(false)

    const resolvedUser = f.user
    expect(userResolved).toBe(true)
    expect(addressResolved).toBe(false)

    const resolvedAddress = f.address
    expect(addressResolved).toBe(true)
  })
})
