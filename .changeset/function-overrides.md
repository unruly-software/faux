---
"@unruly-software/faux": minor
---

Support function overrides in fixture options. Model override values now accept
either a plain partial object or a function `(initial, ctx) => Partial<TData>`
that receives the factory-produced data and the model context, enabling deep
nested overrides via spread of the initial value.
