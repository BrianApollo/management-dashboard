export type IssueStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'blocked'
  | 'cancelled';

export type IssuePriority = 'critical' | 'high' | 'medium' | 'low';

export interface Issue {
  id: string;
  companyId: string;
  identifier: string;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  parentId?: string | null;
  checkoutRunId?: string | null;
  executionRunId?: string | null;
  requestDepth: number;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueDetail extends Issue {
  ancestors?: Issue[];
  project?: { id: string; name: string } | null;
  goal?: { id: string; title: string } | null;
}

export interface IssueComment {
  id: string;
  issueId: string;
  body: string;
  authorAgentId?: string | null;
  authorUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListIssuesParams {
  status?: IssueStatus;
  assigneeAgentId?: string;
  assigneeUserId?: string;
  projectId?: string;
  labelId?: string;
  q?: string;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeAgentId?: string;
  assigneeUserId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  comment?: string;
}

export interface CheckoutIssueInput {
  agentId: string;
  expectedStatuses: IssueStatus[];
}

export interface AddCommentInput {
  body: string;
  reopen?: boolean;
  interrupt?: boolean;
}

export type RunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'timed_out';

export interface HeartbeatRun {
  id: string;
  companyId: string;
  agentId: string;
  status: RunStatus;
  invocationSource?: 'timer' | 'assignment' | 'on_demand' | 'automation';
  triggerDetail?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  exitCode?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RunLogResponse {
  content: string;
  nextOffset: number;
  eof: boolean;
}

export function isTerminalStatus(status: RunStatus | undefined | null): boolean {
  return (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'timed_out'
  );
}
