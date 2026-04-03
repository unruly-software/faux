import {
  Context,
  ContextConfig,
  HelpersConfig,
  HelperValues,
  ModelDefinition,
  FixtureOptions,
  FixtureResult,
  InternalConfig,
  ModelFactory,
  ModelTransform,
  ModelContext,
  NamedCaseDefinition,
} from './types'
import { ModelResolver } from './ModelResolver'
import { CursorManager } from './CursorManager'
import { ModelContextFactory } from './ModelContextFactory'
import { DefinitionRegistry } from './DefinitionRegistry'
import { HelperManager } from './HelperManager'
import { NamedCases } from './NamedCases'

export function defineContext<THelpers extends HelpersConfig>(
  config: ContextConfig<THelpers> & { shared?: undefined },
): Context<THelpers, Record<string, never>>
export function defineContext<THelpers extends HelpersConfig, TShared>(
  config: ContextConfig<THelpers> & {
    shared: (context: { helpers: HelperValues<THelpers> }) => TShared
  },
): Context<THelpers, TShared>
export function defineContext<THelpers extends HelpersConfig>(
  config: ContextConfig<THelpers>,
): Context<THelpers, any> {
  const context: Context<THelpers, any> = {
    config,
    defineModel<TData, TResult = TData>(
      factory: ModelFactory<ModelContext<THelpers, any>, TData>,
      transform?: ModelTransform<TData, TResult>,
    ): ModelDefinition<ModelContext<THelpers, any>, TData, TResult> {
      return {
        factory,
        transform,
      }
    },
    defineFixtures<
      TModels extends Record<string, ModelDefinition<any, any, any>>,
    >(models: TModels) {
      const createFixtures = function (
        options?: FixtureOptions<TModels, any, THelpers>,
      ): FixtureResult<TModels, any> {
        const internalConfig: InternalConfig = {
          seed: options?.seed ?? 1,
          cursorIncrease: options?.cursorIncrease ?? 1000,
          override: options?.override ?? {},
          contextDef: context as any,
          getSharedValue: context.config.shared ?? (() => ({})),
          sharedOverride: (options?.override?.shared ?? {}) as Record<
            string,
            any
          >,
          helperOverride: (options?.override?.helpers ??
            {}) as Partial<THelpers>,
        }

        const registry = new DefinitionRegistry(models)
        const cursorManager = new CursorManager(internalConfig, registry)
        const helperManager = new HelperManager(internalConfig, cursorManager)

        /**
         * Shared values can be provided either in the defineContext config or by
         * partial overwriting them in the fixture options.
         *
         * These are "singleton" values that should not be reset or changed.
         **/
        const sharedValues = {
          ...internalConfig.getSharedValue({
            helpers: helperManager.sharedHelpers,
          }),
          ...internalConfig.sharedOverride,
        }

        const contextFactory = new ModelContextFactory(
          registry,
          internalConfig,
          sharedValues,
          cursorManager,
          helperManager,
        )

        const resolver = new ModelResolver(
          registry,
          internalConfig.override,
          contextFactory,
        )

        const result = {} as FixtureResult<TModels>

        /**
         * Getters are used to allow for lazy evaluation of models without needing
         * to invoke each model as a function.
         *
         * This also allows for models to reference each other without worrying
         * about the order of evaluation.
         */
        for (const name of registry.orderedModelNames) {
          Object.defineProperty(result, name, {
            get: () => {
              return resolver.resolveByName(name)
            },
            enumerable: true,
            configurable: true,
          })
        }

        result.reset = (modelName) => {
          resolver.reset(modelName)
          cursorManager.reset(modelName)
          contextFactory.reset(modelName)
        }

        result.update = (modelName, model) => resolver.update(modelName, model)

        result.shared = sharedValues
        Object.defineProperty(result, 'shared', { enumerable: false })
        Object.defineProperty(result, 'reset', { enumerable: false })
        Object.defineProperty(result, 'update', { enumerable: false })

        return result
      }

      createFixtures.defineNamedCases = function <
        TCases extends Record<
          string,
          NamedCaseDefinition<TModels, any, THelpers>
        >,
      >(
        cases: TCases,
        defaults?: Partial<FixtureOptions<TModels, any, THelpers>>,
      ) {
        return new NamedCases(
          (options?: FixtureOptions<TModels, any, THelpers>) =>
            createFixtures(options),
          cases,
          defaults,
        )
      }

      return createFixtures
    },
  }

  return context
}
