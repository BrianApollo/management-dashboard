import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { cancelRun, getActiveRun, getRunLog } from '../../apis/paperclip/api';
import {
  isTerminalStatus,
  type HeartbeatRun,
  type Issue,
  type RunStatus,
} from '../../apis/paperclip/types';

interface LiveRunModalProps {
  open: boolean;
  onClose: () => void;
  issue: Issue | null;
}

const RUN_POLL_MS = 1500;
const LOG_POLL_MS = 1000;
const LOG_CHUNK_BYTES = 8192;

type LogKind =
  | 'wrapper'
  | 'system'
  | 'thinking'
  | 'tool_use'
  | 'tool_result'
  | 'text'
  | 'stderr'
  | 'raw';

interface LogEntry {
  key: number;
  kind: LogKind;
  text: string;
  meta?: string;
}

interface PaperclipEnvelope {
  ts?: string;
  stream?: 'stdout' | 'stderr';
  chunk?: string;
}

function safeParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function summarizeToolInput(input: unknown): string {
  if (input == null) return '';
  if (typeof input === 'string') return truncate(input, 80);
  if (typeof input !== 'object') return String(input);
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return '';
  const first = keys[0];
  const val = obj[first];
  if (typeof val === 'string') return `${first}: ${truncate(val, 80)}`;
  return keys.slice(0, 3).join(', ');
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
}

function parseClaudeEvent(evt: unknown, nextKey: () => number): LogEntry[] {
  if (!evt || typeof evt !== 'object') return [];
  const e = evt as Record<string, unknown>;

  if (e.type === 'system' && e.subtype === 'init') {
    const model = typeof e.model === 'string' ? e.model : '';
    return [{ key: nextKey(), kind: 'system', text: 'Session started', meta: model }];
  }

  if (e.type === 'assistant') {
    const message = e.message as { content?: unknown[] } | undefined;
    const content = message?.content;
    if (!Array.isArray(content)) return [];
    const out: LogEntry[] = [];
    for (const c of content as Array<Record<string, unknown>>) {
      if (c.type === 'thinking' && typeof c.thinking === 'string') {
        out.push({ key: nextKey(), kind: 'thinking', text: c.thinking });
      } else if (c.type === 'tool_use') {
        out.push({
          key: nextKey(),
          kind: 'tool_use',
          text: typeof c.name === 'string' ? c.name : 'tool',
          meta: summarizeToolInput(c.input),
        });
      } else if (c.type === 'text' && typeof c.text === 'string') {
        out.push({ key: nextKey(), kind: 'text', text: c.text });
      }
    }
    return out;
  }

  if (e.type === 'user') {
    const message = e.message as { content?: unknown[] } | undefined;
    const content = message?.content;
    if (!Array.isArray(content)) return [];
    const out: LogEntry[] = [];
    for (const c of content as Array<Record<string, unknown>>) {
      if (c.type === 'tool_result') {
        let preview = '';
        if (typeof c.content === 'string') {
          preview = truncate(c.content, 160);
        } else if (Array.isArray(c.content)) {
          const first = (c.content as Array<Record<string, unknown>>)[0];
          if (first && typeof first.text === 'string') {
            preview = truncate(first.text, 160);
          }
        }
        out.push({ key: nextKey(), kind: 'tool_result', text: 'result', meta: preview });
      }
    }
    return out;
  }

  return [];
}

function parseLogLine(line: string, nextKey: () => number): LogEntry[] {
  const trimmed = line.replace(/\r$/, '');
  if (!trimmed) return [];

  const envelope = safeParse<PaperclipEnvelope>(trimmed);

  if (!envelope || typeof envelope.chunk !== 'string') {
    return [{ key: nextKey(), kind: 'raw', text: trimmed }];
  }

  const chunk = envelope.chunk.replace(/\n+$/, '');
  if (!chunk) return [];

  if (envelope.stream === 'stderr') {
    return [{ key: nextKey(), kind: 'stderr', text: chunk }];
  }

  if (chunk.startsWith('[paperclip]')) {
    return [{ key: nextKey(), kind: 'wrapper', text: chunk }];
  }

  const inner = safeParse<unknown>(chunk);
  if (inner) {
    const entries = parseClaudeEvent(inner, nextKey);
    if (entries.length > 0) return entries;
  }

  return [{ key: nextKey(), kind: 'raw', text: chunk }];
}

const COLORS: Record<LogKind, string> = {
  wrapper: '#6e7681',
  system: '#79c0ff',
  thinking: '#bc8cff',
  tool_use: '#7ee787',
  tool_result: '#d2a8ff',
  text: '#e6edf3',
  stderr: '#ff7b72',
  raw: '#8b949e',
};

const PREFIXES: Record<LogKind, string> = {
  wrapper: '',
  system: '⚡ ',
  thinking: '💭 ',
  tool_use: '→ ',
  tool_result: '← ',
  text: '',
  stderr: '✗ ',
  raw: '',
};

function statusColor(status: RunStatus | undefined): 'default' | 'info' | 'success' | 'error' | 'warning' {
  switch (status) {
    case 'running':
      return 'info';
    case 'succeeded':
      return 'success';
    case 'failed':
    case 'timed_out':
      return 'error';
    case 'cancelled':
      return 'warning';
    default:
      return 'default';
  }
}

function LogLine({ entry }: { entry: LogEntry }) {
  const color = COLORS[entry.kind];
  const prefix = PREFIXES[entry.kind];
  const italic = entry.kind === 'thinking';

  if (entry.kind === 'tool_use') {
    return (
      <Box sx={{ color, mb: 0.25 }}>
        <Box component="span">{prefix}</Box>
        <Box component="span" sx={{ fontWeight: 700 }}>
          {entry.text}
        </Box>
        {entry.meta && (
          <Box component="span" sx={{ opacity: 0.7 }}>
            {` (${entry.meta})`}
          </Box>
        )}
      </Box>
    );
  }

  if (entry.kind === 'tool_result') {
    return (
      <Box sx={{ color, mb: 0.25 }}>
        <Box component="span">{prefix}</Box>
        <Box component="span">{entry.text}</Box>
        {entry.meta && (
          <Box component="span" sx={{ opacity: 0.6 }}>
            {` ${entry.meta}`}
          </Box>
        )}
      </Box>
    );
  }

  if (entry.kind === 'system') {
    return (
      <Box sx={{ color, mb: 0.25 }}>
        <Box component="span">{prefix}</Box>
        <Box component="span">{entry.text}</Box>
        {entry.meta && (
          <Box component="span" sx={{ opacity: 0.7 }}>
            {` (${entry.meta})`}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        color,
        fontStyle: italic ? 'italic' : 'normal',
        mb: 0.25,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {prefix}
      {entry.text}
    </Box>
  );
}

export function LiveRunModal({ open, onClose, issue }: LiveRunModalProps) {
  const [run, setRun] = useState<HeartbeatRun | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const partialRef = useRef('');
  const keyRef = useRef(0);
  const termRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setRun(null);
    setEntries([]);
    setError(null);
    offsetRef.current = 0;
    partialRef.current = '';
    keyRef.current = 0;
  }, [open, issue?.identifier]);

  // Poll for active run.
  useEffect(() => {
    if (!open || !issue) return;
    let cancelled = false;

    async function tick() {
      try {
        const r = await getActiveRun(issue!.identifier);
        if (cancelled) return;
        setRun(r);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to fetch run');
      }
    }

    tick();
    if (run && isTerminalStatus(run.status)) return;
    const id = window.setInterval(tick, RUN_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, issue, run?.status]);

  // Poll the log once we have a runId. Parse NDJSON + render structured entries.
  useEffect(() => {
    if (!open || !run?.id) return;
    let cancelled = false;

    async function tick() {
      try {
        const res = await getRunLog(run!.id, offsetRef.current, LOG_CHUNK_BYTES);
        if (cancelled) return;

        if (res.content) {
          const combined = partialRef.current + res.content;
          const lines = combined.split('\n');
          partialRef.current = lines.pop() ?? '';
          const nextKey = () => ++keyRef.current;
          const newEntries: LogEntry[] = [];
          for (const line of lines) {
            newEntries.push(...parseLogLine(line, nextKey));
          }
          if (newEntries.length > 0) {
            setEntries((prev) => [...prev, ...newEntries]);
          }
        }
        if (typeof res.nextOffset === 'number') {
          offsetRef.current = res.nextOffset;
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to fetch log');
      }
    }

    tick();
    if (run && isTerminalStatus(run.status)) return;
    const id = window.setInterval(tick, LOG_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, run?.id, run?.status]);

  // Auto-scroll on new entries.
  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  async function handleCancel() {
    if (!run) return;
    setCancelling(true);
    try {
      await cancelRun(run.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  }

  const terminal = run && isTerminalStatus(run.status);
  const statusLabel = run?.status ?? 'waiting';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" component="span" sx={{ flex: 1 }}>
            {issue?.title ?? 'Task'}
          </Typography>
          <Chip label={statusLabel} size="small" color={statusColor(run?.status)} />
        </Box>
        {issue?.identifier && (
          <Typography variant="caption" color="text.secondary">
            {issue.identifier}
          </Typography>
        )}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {issue?.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, whiteSpace: 'pre-wrap' }}
          >
            {issue.description}
          </Typography>
        )}

        <Box
          ref={termRef}
          sx={{
            bgcolor: '#0d1117',
            fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
            fontSize: 12.5,
            lineHeight: 1.55,
            p: 2,
            height: 420,
            overflowY: 'auto',
            borderRadius: 1,
            border: '1px solid #30363d',
          }}
        >
          {entries.length === 0 && !run && (
            <Box sx={{ color: '#8b949e' }}>Waiting for agent run to start…</Box>
          )}
          {entries.length === 0 && run && !terminal && (
            <Box sx={{ color: '#8b949e' }}>Run started — waiting for output…</Box>
          )}
          {entries.map((e) => (
            <LogLine key={e.key} entry={e} />
          ))}
          {run && !terminal && (
            <Box component="span" sx={{ color: '#7ee787' }}>
              ▍
            </Box>
          )}
        </Box>

        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        {run && !terminal && (
          <Button onClick={handleCancel} color="warning" disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel Run'}
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
