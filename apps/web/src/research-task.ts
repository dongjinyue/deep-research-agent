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

export const RESEARCH_STEP_STATUS_LABELS = {
  pending: '等待执行',
  running: '执行中',
  completed: '已完成',
} as const

export type ResearchStepStatus = keyof typeof RESEARCH_STEP_STATUS_LABELS

export interface ResearchStep {
  id: string
  title: string
  description: string
  status: ResearchStepStatus
}

export interface ResearchPlan {
  id: string
  taskId: string
  steps: ResearchStep[]
}

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

// 使用可辨识联合，明确 Plan 只会在 planning 成功结束后出现。
export type ResearchTask =
  | (ResearchTaskBase & {
      status: 'planning'
      plan?: never
      error?: never
    })
  | (ResearchTaskBase & {
      status: 'researching' | 'generating' | 'completed'
      plan: ResearchPlan
      error?: never
    })
  | (ResearchTaskBase & {
      status: 'failed'
      plan?: ResearchPlan
      error: ResearchTaskError
    })
  | (ResearchTaskBase & {
      status: 'cancelled'
      plan?: ResearchPlan
      error?: never
    })

interface ResearchTaskTransitionOptions {
  plan?: ResearchPlan
  error?: ResearchTaskError
}

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
let nextMockPlanId = 1

const MOCK_RESEARCH_STEP_TEMPLATES = [
  {
    title: '明确研究范围',
    description: (question: string) =>
      `围绕“${question}”确认关键概念、比较维度和研究边界。`,
  },
  {
    title: '收集并核验资料',
    description: () => '按研究维度收集资料，并交叉核验关键信息。',
  },
  {
    title: '整理结论与引用',
    description: () => '基于已核验资料整理结论和可追溯引用。',
  },
] as const

export function createMockResearchPlan(
  taskId: string,
  question: string,
): ResearchPlan {
  const normalizedQuestion = question.trim()

  if (!taskId || !normalizedQuestion) {
    throw new Error('创建 Research Plan 时必须提供 Task id 和非空问题')
  }

  const planId = `mock-research-plan-${nextMockPlanId++}`

  return {
    id: planId,
    taskId,
    steps: MOCK_RESEARCH_STEP_TEMPLATES.map((template, index) => ({
      id: `${planId}-step-${index + 1}`,
      title: template.title,
      description: template.description(normalizedQuestion),
      status: 'pending',
    })),
  }
}

export function transitionResearchTask(
  task: ResearchTask,
  nextStatus: ResearchTaskStatus,
  options: ResearchTaskTransitionOptions = {},
): ResearchTask {
  // 显式拓宽只读元组，便于用同一个检查处理不同当前状态的目标集合。
  const allowedStatuses: readonly ResearchTaskStatus[] =
    ALLOWED_RESEARCH_TASK_TRANSITIONS[task.status]

  if (!allowedStatuses.includes(nextStatus)) {
    throw new Error(`不允许 Research Task 从 ${task.status} 转换为 ${nextStatus}`)
  }

  const plan = options.plan ?? task.plan

  if (nextStatus === 'researching') {
    if (!plan || plan.taskId !== task.id) {
      throw new Error('Research Task 进入 researching 时必须拥有匹配的 Research Plan')
    }

    if (plan.steps.filter((step) => step.status === 'running').length !== 1) {
      throw new Error('Research Task 进入 researching 时必须恰有一个 running Step')
    }
  }

  if (nextStatus === 'generating') {
    if (!plan || plan.steps.some((step) => step.status !== 'completed')) {
      throw new Error('Research Task 进入 generating 前必须完成全部 Steps')
    }
  }

  if (nextStatus === 'failed') {
    if (!options.error) {
      throw new Error('Research Task 进入 failed 时必须提供结构化错误')
    }

    return {
      ...task,
      status: nextStatus,
      error: options.error,
    }
  }

  if (nextStatus === 'cancelled') {
    return {
      ...task,
      status: nextStatus,
      error: undefined,
    }
  }

  if (!plan) {
    throw new Error(`Research Task 进入 ${nextStatus} 时必须拥有 Research Plan`)
  }

  if (nextStatus === 'planning') {
    throw new Error('Research Task 不能转换回 planning')
  }

  // 成功路径返回新对象并保留 Plan，供测试和后续审计使用。
  return {
    ...task,
    status: nextStatus,
    plan,
    error: undefined,
  }
}

function updateResearchStepStatuses(
  plan: ResearchPlan,
  statuses: readonly ResearchStepStatus[],
): ResearchPlan {
  return {
    ...plan,
    steps: plan.steps.map((step, index) => ({
      ...step,
      status: statuses[index] ?? step.status,
    })),
  }
}

export function advanceMockResearchTask(task: ResearchTask): ResearchTask {
  if (task.status === 'planning') {
    const plan = createMockResearchPlan(task.id, task.question)

    if (plan.steps.length === 0) {
      throw new Error('Research Plan 至少需要一个步骤才能开始研究')
    }

    const statuses = plan.steps.map<ResearchStepStatus>((_, index) =>
      index === 0 ? 'running' : 'pending',
    )
    const planWithRunningStep = updateResearchStepStatuses(plan, statuses)

    return transitionResearchTask(task, 'researching', {
      plan: planWithRunningStep,
    })
  }

  if (task.status === 'researching') {
    const runningIndex = task.plan.steps.findIndex(
      (step) => step.status === 'running',
    )

    if (runningIndex === -1) {
      throw new Error('researching Task 必须有一个 running Step')
    }

    const nextStepIndex = task.plan.steps.findIndex(
      (step, index) => index > runningIndex && step.status === 'pending',
    )
    const statuses = task.plan.steps.map<ResearchStepStatus>((step, index) => {
      if (index === runningIndex) return 'completed'
      if (index === nextStepIndex) return 'running'
      return step.status
    })
    const nextTask = {
      ...task,
      plan: updateResearchStepStatuses(task.plan, statuses),
    }

    return nextStepIndex === -1
      ? transitionResearchTask(nextTask, 'generating')
      : nextTask
  }

  if (task.status === 'generating') {
    return transitionResearchTask(task, 'completed')
  }

  throw new Error(`终态 Research Task ${task.status} 不能继续自动推进`)
}

export function createMockResearchTask(
  question: string,
  terminalStatus?: MockResearchTerminalStatus,
): ResearchTask {
  const normalizedQuestion = question.trim()

  if (!normalizedQuestion) {
    throw new Error('创建 Research Task 时必须提供非空问题')
  }

  const taskId = `mock-research-task-${nextMockTaskId++}`
  const task: ResearchTask = {
    id: taskId,
    question: normalizedQuestion,
    status: 'planning',
    createdAt: new Date().toISOString(),
  }

  // 终态参数只服务本地 Mock，用于验证 planning 期间失败或取消。
  if (terminalStatus === 'failed') {
    return transitionResearchTask(task, 'failed', {
      error: {
        code: 'mock_plan_generation_failed',
        message: '本地模拟计划生成失败',
        retryable: true,
      },
    })
  }

  if (terminalStatus === 'cancelled') {
    return transitionResearchTask(task, 'cancelled')
  }

  return task
}
