import {describe, it, expect, expectTypeOf} from 'vitest'
import {faux} from '../src'


const context = faux.defineContext({
  helpers: {
    id: (ctx) => ctx.getCursor()
  },
  shared: (ctx) => ({
    tenantId: 888
  })
})

class Tenant {
  constructor(public tenantId: number, public name: string) {}
}

const tenant = context.defineModel((ctx) => ({
  tenantId: ctx.helpers.id,
  name: `Tenant ${ctx.helpers.id}`,
}), (data) => new Tenant(data.tenantId, data.name))

const user = context.defineModel((ctx) => ({
  userId: ctx.helpers.id,
  tenantId: ctx.find(tenant).tenantId
}))

const otherUser = context.defineModel((ctx) => ({
  userId: ctx.helpers.id,
  tenantId: ctx.find(tenant).tenantId
}))

const exampleTypeError = context.defineModel((ctx) => {
  expectTypeOf(ctx.shared).toEqualTypeOf<{tenantId: number}>()
  return {}
})


const useFixtures = context.defineFixtures({
  tenant,
  user,
  otherUser,
})

describe('fixture consistency', () => {
  it('should generate the same data across multiple fixture invocations', () => {
    const f = useFixtures()
    const f2 = useFixtures()

    expect(f.tenant).toEqual(f2.tenant)
    expect(f.user).toEqual(f2.user)
    expect(f.otherUser).toEqual(f2.otherUser)
  })

  it('should override the tenantId consistently across models', () => {
    const f = useFixtures({override: {tenant: {tenantId: 666}}})

    expect(f.tenant.tenantId).toBe(666)
    expect(f.user.tenantId).toBe(666)
    expect(f.otherUser.tenantId).toBe(666)
    expect(f.tenant.name).toBe('Tenant 1002')
  })

  it('should override the tenantId consistently across models', () => {
    const f = useFixtures({override: {tenant: {tenantId: 666}, user: {tenantId: 777}}})

    expect(f.tenant.tenantId).toBe(666)
    expect(f.user.tenantId).toBe(777)
    expect(f.otherUser.tenantId).toBe(666)
    expect(f.tenant.name).toBe('Tenant 1002')

    f.reset()

    expect(f.tenant.tenantId).toBe(666)
    expect(f.user.tenantId).toBe(777)
    expect(f.otherUser.tenantId).toBe(666)
    expect(f.tenant.name).toBe('Tenant 1002')
  })

  it('should have referential integrity across models', () => {
    const f = useFixtures()
    expect(f.user === f.user).toBe(true)
  })

  it('should not have referential integrity across fixture instances', () => {
    const f1 = useFixtures()
    const f2 = useFixtures()

    expect(f1.user === f2.user).toBe(false)
  })

  it('should not have referential integrity after resetting the fixtures', () => {
    const f = useFixtures()
    const user1 = f.user
    f.reset()
    const user2 = f.user

    expect(user1 === user2).toBe(false)
  })
})
