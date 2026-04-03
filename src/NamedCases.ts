import { FixtureOptions, FixtureResult, ModelDefinition } from './types'
import { FauxError } from './validation'

export interface NamedCaseDefinition<
  TModels,
  TShared,
  THelpers extends import('./types').HelpersConfig = any,
> {
  seed?: number
  cursorIncrease?: number
  override?: FixtureOptions<TModels, TShared, THelpers>['override']
}

export interface ForEachOptions<TCases extends Record<string, any>> {
  skip?: Array<keyof TCases>
  only?: Array<keyof TCases>
}

export class NamedCases<
  TCases extends Record<
    string,
    NamedCaseDefinition<TModels, TShared, THelpers>
  >,
  TModels extends Record<string, ModelDefinition<any, any, any>>,
  TShared = any,
  THelpers extends import('./types').HelpersConfig = any,
> {
  constructor(
    private fixtureFactory: (
      options?: FixtureOptions<TModels, TShared, THelpers>,
    ) => FixtureResult<TModels, TShared>,
    private cases: TCases,
    private defaults?: Partial<FixtureOptions<TModels, TShared, THelpers>>,
  ) {}
  use<K extends keyof TCases>(
    caseName: K,
    additionalOptions: Partial<FixtureOptions<TModels, TShared, THelpers>> = {},
  ): FixtureResult<TModels, TShared> {
    const caseConfig = this.cases[caseName]
    if (!caseConfig) {
      throw new FauxError(
        `Case '${String(caseName)}' not found. Available cases: [${Object.keys(
          this.cases,
        ).join(', ')}]`,
      )
    }

    const mergedOptions: FixtureOptions<TModels, TShared, THelpers> = {
      ...this.defaults,
      ...caseConfig,
      override: this.mergeOverrides(
        this.defaults?.override ?? {},
        caseConfig.override,
        additionalOptions.override ?? {},
      ),
    }

    if (additionalOptions.seed !== undefined) {
      mergedOptions.seed = additionalOptions.seed
    }
    if (additionalOptions.cursorIncrease !== undefined) {
      mergedOptions.cursorIncrease = additionalOptions.cursorIncrease
    }

    return this.fixtureFactory(mergedOptions)
  }
  forEach<K extends keyof TCases, RT>(
    options: ForEachOptions<TCases>,
    iterator: (caseName: K, fixtures: FixtureResult<TModels, TShared>) => RT,
  ): RT[] {
    const caseNames = Object.keys(this.cases) as K[]

    let filteredCases: K[] = caseNames

    if (options.only) {
      filteredCases = filteredCases.filter((name) =>
        options.only!.includes(name),
      )
    }
    if (options.skip) {
      filteredCases = filteredCases.filter(
        (name) => !options.skip?.includes(name),
      )
    }

    return filteredCases.map((name) => {
      const caseDef = this.cases[name]
      if (!caseDef) {
        throw new FauxError(
          `Case '${String(name)}' not found. Available cases: [${Object.keys(
            this.cases,
          ).join(', ')}]`,
        )
      }

      const fixtures = this.use(name)
      return iterator(name, fixtures)
    })
  }

  private mergeOverrides(
    ...overrides: Array<
      FixtureOptions<TModels, TShared, THelpers>['override'] | undefined
    >
  ): FixtureOptions<TModels, TShared, THelpers>['override'] {
    const result: any = {}

    for (const override of overrides) {
      if (!override) continue
      for (const key in override) {
        if (key === 'shared') {
          /**
           * Shared values may include strings or objects so we
           * cannot/should not merge them deeply
           **/
          result.shared = {
            ...result.shared,
            ...override.shared,
          }
        } else if (key === 'helpers') {
          /**
           * Helper values may include various types so we
           * cannot/should not merge them deeply
           **/
          result.helpers = {
            ...result.helpers,
            ...override.helpers,
          }
        } else {
          /** Shallow merge models to allow keeping basic properties */
          result[key] = {
            ...result[key],
            ...override[key],
          }
        }
      }
    }

    return result
  }
}
