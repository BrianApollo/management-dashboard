/**
 * Paperclip Issues API
 *
 * Handles issue CRUD, checkout/release, and comments against the Paperclip API.
 */

import type {
  AddCommentInput,
  CheckoutIssueInput,
  CreateIssueInput,
  HeartbeatRun,
  Issue,
  IssueComment,
  IssueDetail,
  ListIssuesParams,
  RunLogResponse,
  UpdateIssueInput,
} from './types';

const API_URL = import.meta.env.VITE_PAPERCLIP_API_URL as string;
const COMPANY_ID = import.meta.env.VITE_PAPERCLIP_COMPANY_ID as string;
const API_TOKEN = import.meta.env.VITE_PAPERCLIP_API_TOKEN as string;

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_TOKEN}`,
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string; message?: string };
      message = err.error || err.message || message;
    } catch {
      // fall through with default message
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * List issues for the configured company.
 */
export async function listIssues(params: ListIssuesParams = {}): Promise<Issue[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  }
  const qs = query.toString();
  const path = `/companies/${COMPANY_ID}/issues${qs ? `?${qs}` : ''}`;
  return request<Issue[]>(path);
}

/**
 * Fetch a single issue by ID or identifier (e.g. "PAP-42").
 */
export async function getIssue(idOrIdentifier: string): Promise<IssueDetail> {
  return request<IssueDetail>(`/issues/${idOrIdentifier}`);
}

/**
 * Create an issue under the configured company.
 */
export async function createIssue(input: CreateIssueInput): Promise<Issue> {
  return request<Issue>(`/companies/${COMPANY_ID}/issues`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update an issue by identifier.
 */
export async function updateIssue(
  identifier: string,
  input: UpdateIssueInput
): Promise<Issue> {
  return request<Issue>(`/issues/${identifier}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/**
 * Atomically assign an issue to an agent and mark it in_progress.
 */
export async function checkoutIssue(
  identifier: string,
  input: CheckoutIssueInput
): Promise<Issue> {
  return request<Issue>(`/issues/${identifier}/checkout`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Release a checked-out issue back to its previous state.
 */
export async function releaseIssue(identifier: string): Promise<Issue> {
  return request<Issue>(`/issues/${identifier}/release`, { method: 'POST' });
}

/**
 * Delete an issue by identifier.
 */
export async function deleteIssue(identifier: string): Promise<void> {
  await request<void>(`/issues/${identifier}`, { method: 'DELETE' });
}

/**
 * List comments on an issue.
 */
export async function listComments(identifier: string): Promise<IssueComment[]> {
  return request<IssueComment[]>(`/issues/${identifier}/comments`);
}

/**
 * Add a comment to an issue. Can optionally reopen or interrupt an active run.
 */
export async function addComment(
  identifier: string,
  input: AddCommentInput
): Promise<IssueComment> {
  return request<IssueComment>(`/issues/${identifier}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Get the active heartbeat run for an issue, or null if none is running.
 */
export async function getActiveRun(identifier: string): Promise<HeartbeatRun | null> {
  return request<HeartbeatRun | null>(`/issues/${identifier}/active-run`);
}

/**
 * Fetch a byte-range of a heartbeat run's log. Use offset + limitBytes to tail.
 *
 * The endpoint returns either `{ content, nextOffset, eof }` JSON or a raw text
 * body. When `nextOffset` is missing, we advance the offset by the UTF-8 byte
 * length of the received content so callers don't re-read the same bytes.
 */
export async function getRunLog(
  runId: string,
  offset = 0,
  limitBytes = 4096
): Promise<RunLogResponse> {
  const params = new URLSearchParams({
    offset: String(offset),
    limitBytes: String(limitBytes),
  });

  const res = await fetch(
    `${API_URL}/heartbeat-runs/${runId}/log?${params.toString()}`,
    { headers: headers() }
  );

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string; message?: string };
      message = err.error || err.message || message;
    } catch {
      // fall through
    }
    throw new Error(message);
  }

  const text = await res.text();

  try {
    const parsed = JSON.parse(text) as Partial<RunLogResponse>;
    if (typeof parsed.content === 'string') {
      const content = parsed.content;
      const nextOffset =
        typeof parsed.nextOffset === 'number'
          ? parsed.nextOffset
          : offset + new Blob([content]).size;
      return { content, nextOffset, eof: !!parsed.eof };
    }
  } catch {
    // body wasn't JSON — treat as raw log text
  }

  return {
    content: text,
    nextOffset: offset + new Blob([text]).size,
    eof: false,
  };
}

/**
 * Cancel an in-flight heartbeat run. Board members only.
 */
export async function cancelRun(runId: string): Promise<void> {
  await request<void>(`/heartbeat-runs/${runId}/cancel`, { method: 'POST' });
}

/**
 * Wake up an agent to start a new heartbeat run immediately.
 */
export async function wakeupAgent(
  agentId: string,
  input: { source: 'on_demand' | 'timer' | 'assignment' | 'automation'; reason?: string } = { source: 'on_demand' }
): Promise<unknown> {
  return request(`/agents/${agentId}/wakeup`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
