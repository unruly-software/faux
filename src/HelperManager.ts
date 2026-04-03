import { CursorManager } from './CursorManager'
import { HelperValues, HelpersConfig, InternalConfig } from './types'

export class HelperManager<THelpers extends HelpersConfig> {
  sharedHelpers: HelperValues<THelpers>

  constructor(
    private internalConfig: InternalConfig,
    private cursorManager: CursorManager,
  ) {
    this.sharedHelpers = createHelperValues(
      this.internalConfig,
      this.cursorManager.getSharedCursor,
    )
  }

  withCursor(getCursor: () => number): HelperValues<THelpers> {
    return createHelperValues(this.internalConfig, getCursor)
  }
}

function createHelperValues<THelpers extends HelpersConfig>(
  config: InternalConfig<THelpers>,
  getCursor: () => number,
): HelperValues<THelpers> {
  const result = {} as HelperValues<THelpers>

  for (const [key, helper] of Object.entries(
    config.contextDef.config.helpers,
  )) {
    if (config.helperOverride && key in config.helperOverride) {
      const overrideHelper = config.helperOverride[key as keyof THelpers]
      Object.defineProperty(result, key, {
        get: () => overrideHelper!({ seed: config.seed, getCursor }),
        enumerable: true,
        configurable: true,
      })
    } else {
      // Use the original helper function
      Object.defineProperty(result, key, {
        get: () => helper({ seed: config.seed, getCursor }),
        enumerable: true,
        configurable: true,
      })
    }
  }

  return result
}
