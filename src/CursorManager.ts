import { DefinitionRegistry } from './DefinitionRegistry'
import { InternalConfig } from './types'

/**
 * In order to allow resetting cursors back to their initial values, we need to
 * keep track of both the current cursor value and the initial cursor value for
 * each model and context
 */
interface CursorState {
  current: number
  initial: number
}

export class CursorManager {
  private cursors = new Map<string, CursorState>()

  private sharedCursor: CursorState = { current: 0, initial: 0 }

  constructor(
    private config: InternalConfig,
    private registry: DefinitionRegistry,
  ) {
    this.initializeCursorStates()
  }

  private initializeCursorStates(): void {
    this.sharedCursor = {
      initial: this.config.seed,
      current: this.config.seed,
    }
    this.registry.orderedModelNames.forEach((name, index) => {
      const modelCursorStart =
        this.config.seed + (index + 1) * this.config.cursorIncrease
      this.cursors.set(name, {
        current: modelCursorStart,
        initial: modelCursorStart,
      })
    })
  }

  getCursorFor(modelName: string): number {
    return this.nextCursor(modelName)
  }

  getSharedCursor = (): number => this.sharedCursor.current++

  private nextCursor(modelName: string): number {
    this.registry.validateModelExists(modelName)
    const state = this.cursors.get(modelName)!
    return state.current++
  }

  reset(modelName?: string): void {
    if (modelName) {
      this.registry.validateModelExists(modelName)
      const state = this.cursors.get(modelName)!
      state.current = state.initial
    } else {
      this.initializeCursorStates()
    }
  }
}
