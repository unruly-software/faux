# @unruly-software/faux

## 1.1.0

### Minor Changes

- 51b27c4: Support function overrides in fixture options. Model override values now accept
  either a plain partial object or a function `(initial, ctx) => Partial<TData>`
  that receives the factory-produced data and the model context, enabling deep
  nested overrides via spread of the initial value.

## 1.0.1

### Patch Changes

- 324b49d: Update NPM description
