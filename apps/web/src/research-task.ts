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

export interface ResearchTaskError {
  code: string
  message: string
  retryable: boolean
}

export interface ResearchTask {
  id: string
  question: string
  status: ResearchTaskStatus
  createdAt: string
  error?: ResearchTaskError
}

export const MOCK_RESEARCH_STATUS_SEQUENCE = [
  'planning',
  'researching',
  'generating',
  'completed',
] as const satisfies readonly ResearchTaskStatus[]

export const MOCK_FAILED_MARKER = '[mock:failed]'
export const MOCK_CANCELLED_MARKER = '[mock:cancelled]'

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
  const allowedStatuses: readonly ResearchTaskStatus[] =
    ALLOWED_RESEARCH_TASK_TRANSITIONS[task.status]

  if (!allowedStatuses.includes(nextStatus)) {
    throw new Error(`不允许 Research Task 从 ${task.status} 转换为 ${nextStatus}`)
  }

  if (nextStatus === 'failed' && !error) {
    throw new Error('Research Task 进入 failed 时必须提供结构化错误')
  }

  return {
    ...task,
    status: nextStatus,
    error: nextStatus === 'failed' ? error : undefined,
  }
}

export function createMockResearchTask(question: string): ResearchTask {
  const normalizedQuestion = question.trim()

  // 特殊标记只属于本地测试入口，创建正式任务字段前必须移除。
  const terminalStatus = normalizedQuestion.includes(MOCK_FAILED_MARKER)
    ? 'failed'
    : normalizedQuestion.includes(MOCK_CANCELLED_MARKER)
      ? 'cancelled'
      : null

  const cleanQuestion = normalizedQuestion
    .replaceAll(MOCK_FAILED_MARKER, '')
    .replaceAll(MOCK_CANCELLED_MARKER, '')
    .trim()

  const task: ResearchTask = {
    id: `mock-research-task-${nextMockTaskId++}`,
    question: cleanQuestion,
    status: 'planning',
    createdAt: new Date().toISOString(),
  }

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
