import { ModelDefinition } from './types'
import { FauxError } from './validation'

type ModelsConfig = Record<string, ModelDefinition<any, any, any>>

export class DefinitionRegistry {
  private nameToDefinition = new Map<string, ModelDefinition<any, any, any>>()

  private definitionToName = new Map<ModelDefinition<any, any, any>, string>()

  /**
   * This is a sorted list of each model that was provided to the
   * defineFixtures call
   *
   * The order is important to maintain _as much stability_ as possible when
   * generating new models or adding fields to existing models.
   **/
  public readonly orderedModelNames: string[] = []

  constructor(private config: ModelsConfig) {
    for (const [name, definition] of Object.entries(config)) {
      this.nameToDefinition.set(name, definition)
      this.definitionToName.set(definition, name)
      this.orderedModelNames.push(name)
    }
  }

  findNameForModel(definition: ModelDefinition<any, any, any>): string {
    const modelName = this.definitionToName.get(definition)
    if (!modelName) {
      throw new FauxError(
        `Model not found in registry. Available models: [${this.orderedModelNames.join(
          ', ',
        )}]. ` +
          `Make sure the model is included in the context.defineFixtures() models parameter.`,
      )
    }
    return modelName
  }

  findModelByName(name: string): ModelDefinition<any, any, any> {
    const model = this.nameToDefinition.get(name)
    if (!model) {
      throw new FauxError(
        `Model '${name}' not found in registry. Available models: [${this.orderedModelNames.join(
          ', ',
        )}]`,
      )
    }
    return model
  }

  validateModelExists(name: string): void {
    if (!this.nameToDefinition.has(name)) {
      throw new FauxError(
        `Model '${name}' not found in registry. Available models: [${this.orderedModelNames.join(
          ', ',
        )}]`,
      )
    }
  }
}
