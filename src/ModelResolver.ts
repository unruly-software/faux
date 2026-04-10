import { DefinitionRegistry } from './DefinitionRegistry'
import { ModelContextFactory } from './ModelContextFactory'
import { ModelDefinition, ModelOverrideValue } from './types'
import { FauxError } from './validation'

type ModelsConfig = Record<string, ModelDefinition<any, any, any>>
type ResolverOverrides<TModels extends ModelsConfig = ModelsConfig> = {
  [K in keyof TModels]?: TModels[K] extends ModelDefinition<
    any,
    infer TData,
    any
  >
    ? ModelOverrideValue<TData, any>
    : ModelOverrideValue<Record<string, unknown>, any>
} & Record<string, ModelOverrideValue<any, any>>

export class ModelResolver {
  private nameToInstanceCache = new Map<string, any>()
  private resolvingNames = new Set<string>()

  constructor(
    private registry: DefinitionRegistry,
    private overrides: ResolverOverrides,
    private context: ModelContextFactory<any, any>,
  ) {}

  resolveByName<T>(modelName: string): T {
    return this.resolve(this.registry.findModelByName(modelName))
  }

  resolve = <T>(model: ModelDefinition<any, any, T>): T => {
    if (!model) {
      throw new FauxError(
        `Received ${JSON.stringify(
          model,
        )} instead of a model definition. This likely means there is a circular dependency in your model definitions imports.`,
      )
    }
    const modelName = this.registry.findNameForModel(model)
    if (this.nameToInstanceCache.has(modelName)) {
      return this.nameToInstanceCache.get(modelName)
    }

    if (this.resolvingNames.has(modelName)) {
      throw new FauxError(
        'Circular dependency detected in model resolution for model: ' +
          modelName,
      )
    }

    this.resolvingNames.add(modelName)

    try {
      const modelContext = this.context.getContextFor(modelName, this)
      let data = model.factory(modelContext)

      if (this.overrides[modelName]) {
        const override = this.overrides[modelName]
        const partial =
          typeof override === 'function'
            ? override(data, modelContext)
            : override
        data = { ...data, ...partial }
      }

      const result = model.transform ? model.transform(data) : data
      this.nameToInstanceCache.set(modelName, result)
      return result
    } finally {
      this.resolvingNames.delete(modelName)
    }
  }

  reset(modelName?: string): void {
    if (modelName) {
      this.registry.validateModelExists(modelName)
      this.nameToInstanceCache.delete(modelName)
    } else {
      this.nameToInstanceCache.clear()
    }
  }

  update<T>(modelName: string, value: T): T {
    this.registry.validateModelExists(modelName)
    this.nameToInstanceCache.set(modelName, value)
    return value
  }
}
