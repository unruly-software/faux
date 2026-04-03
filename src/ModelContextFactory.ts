import { ModelContext, HelpersConfig, InternalConfig } from './types'
import { CursorManager } from './CursorManager'
import { ModelResolver } from './ModelResolver'
import { DefinitionRegistry } from './DefinitionRegistry'
import { HelperManager } from './HelperManager'

export class ModelContextFactory<THelpers extends HelpersConfig, TShared> {
  private contexts = new Map<string, ModelContext<THelpers, TShared>>()

  constructor(
    private registry: DefinitionRegistry,
    private internalConfig: InternalConfig<THelpers>,
    private sharedValues: TShared,
    private cursorManager: CursorManager,
    private helperManger: HelperManager<THelpers>,
  ) {}

  getContextFor(
    modelName: string,
    resolver: ModelResolver,
  ): ModelContext<THelpers, TShared> {
    if (!this.contexts.has(modelName)) {
      this.contexts.set(modelName, this.createContext(modelName, resolver))
    }
    return this.contexts.get(modelName)!
  }

  private createContext(
    modelName: string,
    resolver: ModelResolver,
  ): ModelContext<THelpers, TShared> {
    const getCursor = () => this.cursorManager.getCursorFor(modelName)
    const helperValues = this.helperManger.withCursor(getCursor)

    return {
      seed: this.internalConfig.seed,
      getCursor,
      helpers: helperValues,
      shared: this.sharedValues,
      find: resolver.resolve,
    }
  }

  reset(modelName?: string): void {
    if (modelName) {
      this.contexts.delete(modelName)
    } else {
      this.contexts.clear()
    }
  }
}
