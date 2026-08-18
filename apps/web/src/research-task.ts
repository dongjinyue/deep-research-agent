export const PAGE_IDLE_STATUS = 'idle'
export const PAGE_IDLE_STATUS_LABEL = '未开始'

export const RESEARCH_TASK_STATUS_LABELS = {
  planning: '正在制定计划',
  researching: '正在研究',
  generating: '正在生成报告',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
} as const

export type ResearchTaskStatus = keyof typeof RESEARCH_TASK_STATUS_LABELS

type NonFailedResearchTaskStatus = Exclude<ResearchTaskStatus, 'failed'>
export type MockResearchTerminalStatus = Extract<
  ResearchTaskStatus,
  'failed' | 'cancelled'
>

export interface ResearchTaskError {
  code: string
  message: string
  retryable: boolean
}

interface ResearchTaskBase {
  id: string
  question: string
  createdAt: string
}

// 使用可辨识联合，让 TypeScript 强制 failed Task 携带结构化错误。
export type ResearchTask = ResearchTaskBase &
  (
    | {
        status: 'failed'
        error: ResearchTaskError
      }
    | {
        status: NonFailedResearchTaskStatus
        error?: never
      }
  )

export const MOCK_RESEARCH_STATUS_SEQUENCE = [
  'planning',
  'researching',
  'generating',
  'completed',
] as const satisfies readonly ResearchTaskStatus[]

// 所有合法转换集中定义在这里，避免组件绕过领域规则直接改写状态。
const ALLOWED_RESEARCH_TASK_TRANSITIONS = {
  planning: ['researching', 'failed', 'cancelled'],
  researching: ['generating', 'failed', 'cancelled'],
  generating: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
} as const satisfies Record<ResearchTaskStatus, readonly ResearchTaskStatus[]>

let nextMockTaskId = 1

export function transitionResearchTask(
  task: ResearchTask,
  nextStatus: ResearchTaskStatus,
  error?: ResearchTaskError,
): ResearchTask {
  // 显式拓宽只读元组，便于用同一个检查处理不同当前状态的目标集合。
  const allowedStatuses: readonly ResearchTaskStatus[] =
    ALLOWED_RESEARCH_TASK_TRANSITIONS[task.status]

  if (!allowedStatuses.includes(nextStatus)) {
    throw new Error(`不允许 Research Task 从 ${task.status} 转换为 ${nextStatus}`)
  }

  if (nextStatus === 'failed') {
    if (!error) {
      throw new Error('Research Task 进入 failed 时必须提供结构化错误')
    }

    return {
      ...task,
      status: nextStatus,
      error,
    }
  }

  // 返回新对象而不是修改原 Task，保留转换前状态供测试和后续审计使用。
  return {
    ...task,
    status: nextStatus,
    error: undefined,
  }
}

export function createMockResearchTask(
  question: string,
  terminalStatus?: MockResearchTerminalStatus,
): ResearchTask {
  const normalizedQuestion = question.trim()

  if (!normalizedQuestion) {
    throw new Error('创建 Research Task 时必须提供非空问题')
  }

  const task: ResearchTask = {
    id: `mock-research-task-${nextMockTaskId++}`,
    question: normalizedQuestion,
    status: 'planning',
    createdAt: new Date().toISOString(),
  }

  // 终态参数只服务本地 Mock；仍通过正式转换函数验证领域约束。
  if (terminalStatus === 'failed') {
    return transitionResearchTask(task, 'failed', {
      code: 'mock_research_failed',
      message: '本地模拟研究失败',
      retryable: true,
    })
  }

  if (terminalStatus === 'cancelled') {
    return transitionResearchTask(task, 'cancelled')
  }

  return task
}
