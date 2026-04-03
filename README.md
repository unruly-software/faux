<div align="center">
  <img src="https://github.com/unruly-software/faux/blob/master/docs/logo.png" alt="@unruly-software/faux" width="500">
</div>

<div align="center">

[![Build Status](https://github.com/unruly-software/faux/actions/workflows/build.yml/badge.svg)](https://github.com/unruly-software/faux/actions/workflows/build.yml)
[![npm version](https://badge.fury.io/js/@unruly-software%2Ffaux.svg)](https://www.npmjs.com/package/@unruly-software/faux)
[![Coverage Status](https://coveralls.io/repos/github/unruly-software/faux/badge.svg?branch=master)](https://coveralls.io/github/unruly-software/faux?branch=master)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

</div>

A powerful fixture generation library for testing that provides deterministic,
customizable test data through dependency injection and isolated cursor
management.

Bring your own test framework, or just use it to generate nonproduction fixture
data anywhere you need consistent, repeatable data generation.

## Features

- **Zero-dependency**: No external dependencies required. Just TypeScript.
- **Deterministic**: Same seed and configuration always produce the same output for reliable tests or nonproduction fixture data.
- **Snapshot friendly:** Consistent data generation for reliable snapshots. Even when adding new data.
- **Type-safe**: Full TypeScript support with complete type inference
- **Flexible**: Support for helpers, shared state, and model dependencies
- **Isolated**: Cursor management prevents data collisions between models
- **Lazy**: Models are only resolved when accessed
- **Customizable**: Override any data at the fixture or model level

## Installation

```bash
npm install @unruly-software/faux
```

```bash
yarn add @unruly-software/faux
```

## Quick Start

```typescript
import { faux } from '@unruly-software/faux'

// Step one: define the shared data and helpers your model factories will use.

// This should only needs be doone once per codebase, and then imported into
// your model files.
const context = faux.defineContext({
  helpers: {
    randomName: ({ seed }) => `User${seed}`,
    randomEmail: ({ seed }) => `user${seed}@example.com`
  }
  shared: () => ({
    timestamp: new Date('2024-01-01')
  })
})

// Step two: import your context into your model files and define your model.

// You should have lots and lots of these.
const user = context.defineModel(ctx => ({
  id: ctx.seed,
  name: ctx.helpers.randomName,
  email: ctx.helpers.randomEmail
  createdAt: ctx.shared.timestamp
  // Resolve another model from a different file
  address: ctx.find(address)
}))

// Step three: create your fixture factory and export it for use in your tests.
const fixtures = context.defineFixtures({ user, address })

// Step four: use your fixtures in your tests!
const f = fixtures({ seed: 777 })
console.log(f.user) // { id: 777, name: "User777", email: "user777@example.com", createdAt: Date(2024-01-01T00:00:00.000Z) }
const f2 = fixtures({ seed: 666, override: { user: { email: 'john@example.com' } } })
console.log(f2.user) // { id: 666, name: "User666", email: "john@example.com", createdAt: Date(2024-01-01T00:00:00.000Z) }

```

## Basic Testing Examples

### Simple Test with Model References

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { faux } from '@unruly-software/faux'

const context = faux.defineContext({
  helpers: {
    uuid: ({ seed }) => faux.utils.deterministicUUID(seed),
    faker: ({ seed }) => new Faker({ seed })
  }
})

// Define models
const address = context.defineModel(ctx => ({
  street: `${ctx.seed} Main St`,
  city: `${ctx.helpers.faker.person.firstName()} City`
}))

const user = context.defineModel(ctx => ({
  id: ctx.helpers.uuid,
  name: ctx.helpers.faker.person.firstName(),
  email: `${ctx.helpers.faker.person.firstName().toLowerCase()}@example.com`,
  address: ctx.find(address) // Loads and caches the address model for each fixture instance
}))

const fixtures = context.defineFixtures({ user, address })

describe('User Service', () => {
  const f = fixtures({ seed: 123 }) // Create a fixture instance for this test suite

  beforeEach(() => {
    // lookups like f.user are virtual so you don't need to worry about stale
    // data between tests, but you can also manually reset if needed
    f.reset()
  })

  it('should create user with address', () => {
    expect(f.user.id).toBe('uuid-123')
    expect(f.user.name).toBe('User123')
    expect(f.user.address).toBe(f.address) // Same reference
    expect(f.address.street).toBe('123 Main St')
  })

  it('should override specific values', () => {
    // Override user name in this specific test
    const customF = fixtures({
      seed: 456,
      override: {
      // You can override any part of the model tree. These will be
      // shallow-merged with the generated data.
        user: { name: 'John Doe' }
      }
    })

    expect(customF.user.name).toBe('John Doe')
    expect(customF.user.email).toBe('john@example.com')
    expect(customF.user.id).toBe('uuid-123') // Other values unchanged
  })

  it('should reset fixtures between tests', () => {
    const user1 = f.user
    f.reset() // Reset all cached models
    const user2 = f.user

    expect(user1).not.toBe(user2) // Different instances
    expect(user1.name).toBe(user2.name) // But same data

    f.reset('user') // Reset specific model only
    const user3 = f.user
    expect(user2).not.toBe(user3)
  })
})
```

## Named Fixtures Examples

Find yourself writing the same four scenarios over and over again with just a
few tweaks? Named cases allow you to define a set of named scenarios with
specific seeds and overrides, and then easily iterate over them in your tests
or use them individually.

### Multiple Test Cases with forEach

```typescript
// Same setup as before, but we have more values we care about overriding.
const user = context.defineModel(ctx => ({
  id: ctx.helpers.uuid,
  name: ctx.helpers.faker.person.firstName(),
  role: 'user' as 'user' | 'admin',
  active: true
}))


// Define named test scenarios
const scenarios = fixtures.defineNamedCases({
  regularUser: {
    seed: 100,
    override: { user: { role: 'user', active: false } }
  },
  adminUser: {
    seed: 200,
    override: { user: { role: 'admin' } }
  },
})

describe('User permissions', () => {
  // Test all scenarios automatically
  scenarios.forEach({}, (scenarioName, f) => {
    it(`should handle ${scenarioName} correctly`, () => {
      expect(f.user).toBeDefined()
      expect(f.tenant).toBeDefined()
      expect(typeof f.user.role).toBe('string')
      expect(typeof f.user.active).toBe('boolean')
    })
  })

  // Test only specific scenarios
  scenarios.forEach({ only: ['adminUser'] }, (scenarioName, f) => {
    it(`should validate active users for ${scenarioName}`, () => {
      expect(f.user.active).toBe(true)
    })
  })

  // Skip certain scenarios
  scenarios.forEach({ skip: ['regularUser'] }, (scenarioName, f) => {
    it(`should have valid permissions for ${scenarioName}`, () => {
      expect(['user']).toContain(f.user.role)
    })
  })
})
```

### Single Named Case Usage

You can pull a single named scenario directly into a test without iterating and
even add additional overrides on top of it:

```typescript
describe('Admin-specific features', () => {
  it('should allow admin access', () => {
    // Use a specific named case
    const f = scenarios.use('adminUser')

    expect(f.user.role).toBe('admin')
    expect(f.user.id).toBe('uuid-200')
  })

  it('should allow admin access with additional overrides', () => {
    // Use named case with additional customization
    const f = scenarios.use('adminUser', {
      override: {
        user: { name: 'Super Admin' },
        tenant: { planType: 'premium' }
      }
    })

    expect(f.user.role).toBe('admin') // From named case
    expect(f.user.name).toBe('Super Admin') // Additional override
    expect(f.tenant.planType).toBe('premium') // Additional override
  })
})
```

## API Reference

### `faux.defineContext(config)`

Creates a context with helpers and optional shared state.

Helpers are virtual properties that compute values based on the current seed
and other helpers.

If you have values that need to be shared across multiple models, you can add
them to the context's shared state. This is useful for things like timestamps,

```typescript
const context = faux.defineContext({
  helpers: { uuid: ({ seed }) => `uuid-${seed}` },
  shared: ({ helpers }) => ({ tenantId: helpers.uuid })
})
```

### `context.defineModel(factory, transform?)`

Defines a model with optional transformation.

```typescript
const user = context.defineModel((ctx): ConstructorParameters<User>[0] => ({
  id: ctx.helpers.uuid,
  name: ctx.helpers.faker.name
  // The second parameter allows you to transform the input "parameters"
  // defined above into something that is not a plain javascript object.
}), input => new User(input))
```

NOTE: the factory function must return a plain object that can be
shallow-merged with overrides.

If you want your fixtures to be even more dynamic you can add parameters that
perform side effects or compute values based on the context.

For example here we call user.archive() if the archive parameter is set to true:

```typescript
const user = context.defineModel((ctx) => ({
  id: ctx.helpers.uuid,
  name: ctx.helpers.faker.name,
  archived: false
}), (input, { archive }) => {
  const user = new User(input)
  if (archive) {
    user.archive()
  }
  return user
})
```

### `context.defineFixtures(models)`

Creates a fixture factory function.

This only needs the collection of models you want to resolve, and then you can
create as many fixture instances as you want from it. This is the main entry
point for your tests.

```typescript
const fixtures = context.defineFixtures({ user, address })
```

### Fixture Factory/Fixture Instance

```typescript
const f = fixtures({
  seed: 100,                    // Starting seed (default: 0)
  cursorIncrease: 500,          // Increment between models (default: 1000)
  override: {                   // Override model data
    user: { name: 'John' },
    shared: { tenantId: 'custom-id' }
  }
})

// Access models as virtual properties. They will be generated on demand and
// cached for the lifetime of this fixture instance.
f.user, f.address

// Utility methods
f.reset()                      // Reset all cached models. The next access will regenerate them with the same seed.
f.reset('user')                // Reset specific model
f.update('user', myCustomUser) // Replace cached model
```

### Named Cases/Scenarios

Each named case is essentially a pre-configured fixture instance with a
specific seed and overrides. You can define as many named cases as you want,
and then easily use them in your tests or iterate over them.

```typescript
const scenarios = fixtures.defineNamedCases({
  adminUser: { seed: 100, override: { user: { role: 'admin' } } }
}, { cursorIncrease: 1000 }) // Default options

// Use specific case
scenarios.use('adminUser', { override: { user: { name: 'Admin' } } })

// Iterate cases
scenarios.forEach({ skip: ['case1'] }, (name, fixtures) => { /* test */ })
```

### Context Objects

**Helper Context:** `{ seed: number, getCursor: () => number }`
**Model Context:** `{ seed, getCursor, helpers, shared, find: (model) => T }`

## Advanced Usage

### Cursor Isolation

Each model gets isolated cursor ranges to prevent data collisions.
By default we increase the cursor by 1,000 for each model so that you have
plenty of space to add new models to the end of your fixture tree without
affecting existing data or snapshots. You can customize this with the
`cursorIncrease` option when defining your fixtures:

```typescript
const fixtures = context.defineFixtures({ user, product })

const f = fixtures({ seed: 10, cursorIncrease: 100 })
// User cursors: 110, 111, 112, ...
// Product cursors: 210, 211, 212, ...
```

### Shared State

Shared state is computed once per fixture tree:

```typescript
const context = faux.defineContext({
  shared: ({ helpers }) => ({
    organizationId: helpers.uuid,
    timestamp: new Date('2024-01-01')
  })
})

// All models access the same shared values
const user = context.defineModel(ctx => ({
  organizationId: ctx.shared.organizationId
}))
```

This allows you to add "global" values, or prevent circular dependencies
between models by moving shared values into the context's shared state.

## Common Patterns

### Generating consistent UUIDs

faux comes with a built-in UUID util that generates deterministic UUIDs based
on the seed. You can integrate this into your context helpers for consistent
UUID generation across your fixtures:

```typescript
const context = faux.defineContext({
  helpers: {
    uuid: ({ seed }) => faux.utils.deterministicUUID(seed)
  }
})

const user = context.defineModel(ctx => ({
  id: ctx.helpers.uuid,
  tenantId: ctx.helpers.uuid
}))

const fixtures = context.defineFixtures({ user })

// { id: '00000000-0000-4000-8000-000000000001', tenantId: '00000000-0000-4000-8000-000000000002' }
const {user} = fixtures({ seed: 1 })
```

You can also BYO UUID generator if you want/need to use seeds beyond
the 32-bit integer range.

### Generating consistent faker data

```typescript
import { base, en, en_US, Faker } from '@faker-js/faker';

const context = faux.defineContext({
  helpers: {
    faker: ({ seed }) => new Faker({ seed: idSeed, locale: [en_US, base, en] })
  }
})

const user = context.defineModel(ctx => ({
  id: ctx.seed,
  name: ctx.helpers.faker.person.fullName(),
  email: ctx.helpers.faker.internet.email(),
  avatar: ctx.helpers.faker.image.avatar()
}))
```

### Working with classes or custom data types

While the first parameter to the factory function must return a plain object,
you can use the second parameter to transform that plain object into any data
structure you want, including classes with methods:

```typescript
class User {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public createdAt: Date
  ) {}

  static create(data: { id: string; name: string; email: string; createdAt: Date }) {
    return new User(data.id, data.name, data.email, data.createdAt)
  }
}

const user = context.defineModel(ctx => ({
  id: ctx.helpers.uuid,
  name: ctx.helpers.faker.person.fullName(),
  email: ctx.helpers.faker.internet.email(),
  createdAt: ctx.shared.timestamp
}), User.create)
```

If you have fixtures that only need one parameter, like a date you can also use
a simple factory function with the primitive value you need as a key:

```typescript
const date = context.defineModel(ctx => ({
  myValue: '2024-01-01'
  // This enables overrides like { date: { value:'2024-02-01' } } when using
  // the fixture
}), input => new Date(input.myValue))
```

### Using fixtures for non-testing purposes

If you want to create a model tree to insert data into a database you could use
the fixture function to generate the tree and override any values you want to
be non-deterministic with a custom generator:

```typescript
const context = faux.defineContext({
  helpers: {
    // This makes the default for all fixture resolution to be deterministic
    uuid: ({ seed }) => faux.utils.deterministicUUID(seed)
    faker: ({ seed }) => new Faker({ seed })
  },
  shared: () => ({
    timestamp: new Date('2024-01-01')
  })
})

const user = context.defineModel(ctx => ({
  id: ctx.helpers.uuid,
  name: ctx.helpers.faker.person.fullName(),
  email: ctx.helpers.faker.internet.email(),
  createdAt: ctx.shared.timestamp
}))


const fixtures = context.defineFixtures({ user })

// Here we override the shared and helper values across the entire tree,
// allowing all generated models to have random, or realistic values.
const f = fixtures({
  // You could also pass Math.random() as the seed but that will not be random enough if
  // you are using this to persist a lot of data in multiple runs.
  seed: 123,
  override: {
    shared: { timestamp: new Date() },
    helpers: {
      uuid: () => crypto.randomUUID(),
      // We only override the uuid helper and leave the faker instance alone
    }
  }
})

f.user.id // The UUID was generated by node '96e73242-9657-4fef-8b00-2e1007412506'
f.user.createdAt // This is the current date instead of the fixed date
```

## TypeScript Support

This library is written in TypeScript and provides complete type inference. You
should rarely need to manually annotate types when using it, and if you do, the
types will be enforced throughout your fixtures and tests.

## License

MIT - see [LICENSE](./LICENSE) file for details.

## Contributing

Found a bug or want to contribute? Please open an issue or submit a pull request on [GitHub](https://github.com/unruly-software/faux/issues).
