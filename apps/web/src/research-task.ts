export const RESEARCH_TASK_STATUS_LABELS = {
  idle: '未开始',
  planning: '正在制定计划',
  researching: '正在研究',
  generating: '正在生成报告',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
} as const

export type ResearchTaskStatus = keyof typeof RESEARCH_TASK_STATUS_LABELS

export interface ResearchTask {
  id: string
  question: string
  status: ResearchTaskStatus
  createdAt: string
}

export const MOCK_RESEARCH_STATUS_SEQUENCE = [
  'planning',
  'researching',
  'generating',
  'completed',
] as const satisfies readonly ResearchTaskStatus[]

let nextMockTaskId = 1

export function createMockResearchTask(question: string): ResearchTask {
  return {
    id: `mock-research-task-${nextMockTaskId++}`,
    question: question.trim(),
    status: 'planning',
    createdAt: new Date().toISOString(),
  }
}
