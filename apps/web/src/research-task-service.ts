import type { ResearchTask } from './research-task'

export type ResearchTaskListener = (task: ResearchTask) => void

export interface ResearchRunHandle {
  initialTask: ResearchTask
  stop: () => void
}

export interface ResearchRunner {
  normalizeQuestion: (rawQuestion: string) => string
  start: (
    rawQuestion: string,
    onTaskChange: ResearchTaskListener,
  ) => ResearchRunHandle
}

export interface ResearchTaskService {
  canStart: (rawQuestion: string) => boolean
  start: (
    rawQuestion: string,
    onTaskChange: ResearchTaskListener,
  ) => ResearchTask | null
  dispose: () => void
}

export function createResearchTaskService(
  runner: ResearchRunner,
): ResearchTaskService {
  let activeRun: ResearchRunHandle | null = null
  let runVersion = 0

  return {
    canStart(rawQuestion) {
      return runner.normalizeQuestion(rawQuestion).length > 0
    },

    start(rawQuestion, onTaskChange) {
      if (!runner.normalizeQuestion(rawQuestion)) return null

      activeRun?.stop()
      const currentVersion = ++runVersion
      // 即使旧执行器未及时停止，也不能让迟到事件覆盖新任务。
      const run = runner.start(rawQuestion, (task) => {
        if (currentVersion === runVersion) onTaskChange(task)
      })
      activeRun = run

      return run.initialTask
    },

    dispose() {
      runVersion += 1
      activeRun?.stop()
      activeRun = null
    },
  }
}
