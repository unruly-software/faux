export interface InternalConfig<THelpers extends HelpersConfig = any> {
  seed: number
  cursorIncrease: number
  override: Record<string, any>
  contextDef: Context<THelpers, any>
  getSharedValue: SharedConfig<THelpers>
  sharedOverride: Record<string, any>
  helperOverride: Partial<THelpers>
}

type OnlyStrings<T> = T extends string ? T : never

export interface HelperContext {
  seed: number
  getCursor: () => number
}

export type Helper<T = any> = (context: HelperContext) => T

export interface HelpersConfig {
  [key: string]: Helper
}

export type HelperValues<T extends HelpersConfig> = {
  [K in keyof T]: ReturnType<T[K]>
}

export type SharedConfig<THelpers extends HelpersConfig> = (context: {
  helpers: HelperValues<THelpers>
}) => any

export interface ContextConfig<THelpers extends HelpersConfig> {
  helpers: THelpers
  shared?: SharedConfig<THelpers>
}

export interface ModelContext<
  THelpers extends HelpersConfig,
  TShared = Record<string, never>,
> {
  seed: number
  getCursor: () => number
  helpers: HelperValues<THelpers>
  shared: TShared
  find<T>(model: ModelDefinition<any, any, T>): T
}

export type ModelFactory<
  TContext extends ModelContext<any, any>,
  TData = any,
> = (context: TContext) => TData

export type ModelTransform<TData, TResult> = (data: TData) => TResult

export interface ModelDefinition<
  TContext extends ModelContext<any, any>,
  TData,
  TResult = TData,
> {
  factory: ModelFactory<TContext, TData>
  transform?: ModelTransform<TData, TResult>
}

export interface Context<
  THelpers extends HelpersConfig,
  TShared = Record<string, never>,
> {
  config: ContextConfig<THelpers>
  defineModel<TData, TResult = TData>(
    factory: ModelFactory<ModelContext<THelpers, TShared>, TData>,
    transform?: ModelTransform<TData, TResult>,
  ): ModelDefinition<ModelContext<THelpers, TShared>, TData, TResult>
  defineFixtures<
    TModels extends Record<string, ModelDefinition<any, any, any>>,
  >(
    models: TModels,
  ): FixtureFactory<TModels, TShared, THelpers>
}

export interface FixtureFactory<
  TModels extends Record<string, ModelDefinition<any, any, any>>,
  TShared,
  THelpers extends HelpersConfig,
> {
  (options?: FixtureOptions<TModels, TShared, THelpers>): FixtureResult<
    TModels,
    TShared
  >
  defineNamedCases<
    TCases extends Record<
      string,
      NamedCaseDefinition<TModels, TShared, THelpers>
    >,
  >(
    cases: TCases,
    defaults?: Partial<FixtureOptions<TModels, TShared, THelpers>>,
  ): NamedCases<TCases, TModels, TShared>
}

export interface FixtureOptions<
  TModels = any,
  TShared = any,
  THelpers extends HelpersConfig = any,
> {
  seed?: number
  cursorIncrease?: number
  override?: {
    [K in keyof TModels]?: Partial<
      TModels[K] extends ModelDefinition<any, infer TData, any> ? TData : never
    >
  } & {
    shared?: Partial<TShared>
    helpers?: Partial<THelpers>
  }
}

export type FixtureResult<
  TModels extends Record<string, ModelDefinition<any, any, any>>,
  TShared = any,
> = {
  [K in keyof TModels]: TModels[K] extends ModelDefinition<
    any,
    any,
    infer TResult
  >
    ? TResult
    : never
} & {
  reset(modelName?: OnlyStrings<keyof TModels>): void
  update<K extends OnlyStrings<keyof TModels>>(
    modelName: K,
    model: TModels[K] extends ModelDefinition<any, any, infer TResult>
      ? TResult
      : never,
  ): TModels[K] extends ModelDefinition<any, any, infer TResult>
    ? TResult
    : never
  shared: TShared
}

export interface NamedCaseDefinition<
  TModels,
  TShared,
  THelpers extends HelpersConfig = any,
> {
  seed?: number
  cursorIncrease?: number
  override?: FixtureOptions<TModels, TShared, THelpers>['override']
}

export interface ForEachOptions<TCases extends Record<string, any>> {
  skip?: Array<keyof TCases>
  only?: Array<keyof TCases>
}

export interface NamedCases<
  TCases extends Record<
    string,
    NamedCaseDefinition<TModels, TShared, THelpers>
  >,
  TModels extends Record<string, ModelDefinition<any, any, any>>,
  TShared = any,
  THelpers extends HelpersConfig = any,
> {
  use<K extends keyof TCases>(
    caseName: K,
    additionalOptions?: Partial<FixtureOptions<TModels, TShared, THelpers>>,
  ): FixtureResult<TModels, TShared>
  forEach<K extends keyof TCases, RT>(
    options: ForEachOptions<TCases>,
    iterator: (caseName: K, fixtures: FixtureResult<TModels, TShared>) => RT,
  ): RT[]
}
