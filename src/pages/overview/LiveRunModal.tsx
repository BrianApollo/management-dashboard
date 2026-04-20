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
import { isTerminalStatus, type HeartbeatRun, type Issue, type RunStatus } from '../../apis/paperclip/types';

interface LiveRunModalProps {
  open: boolean;
  onClose: () => void;
  issue: Issue | null;
}

const RUN_POLL_MS = 1500;
const LOG_POLL_MS = 1000;
const LOG_CHUNK_BYTES = 8192;

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

export function LiveRunModal({ open, onClose, issue }: LiveRunModalProps) {
  const [run, setRun] = useState<HeartbeatRun | null>(null);
  const [log, setLog] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const termRef = useRef<HTMLDivElement | null>(null);

  // Reset state when a new issue opens.
  useEffect(() => {
    if (!open) return;
    setRun(null);
    setLog('');
    setError(null);
    offsetRef.current = 0;
  }, [open, issue?.identifier]);

  // Poll for the active run.
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
    const id = window.setInterval(() => {
      if (run && isTerminalStatus(run.status)) return;
      tick();
    }, RUN_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, issue, run]);

  // Poll the log once we have a runId.
  useEffect(() => {
    if (!open || !run?.id) return;
    let cancelled = false;

    async function tick() {
      try {
        const res = await getRunLog(run!.id, offsetRef.current, LOG_CHUNK_BYTES);
        if (cancelled) return;
        if (res.content) {
          setLog((prev) => prev + res.content);
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
    const id = window.setInterval(() => {
      if (run && isTerminalStatus(run.status)) {
        tick();
        return;
      }
      tick();
    }, LOG_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, run?.id, run?.status]);

  // Auto-scroll to bottom on new log content.
  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

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
            color: '#e6edf3',
            fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
            fontSize: 12.5,
            lineHeight: 1.55,
            p: 2,
            height: 380,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            borderRadius: 1,
            border: '1px solid #30363d',
          }}
        >
          {!run && !log && (
            <Box sx={{ color: '#8b949e' }}>Waiting for agent run to start…</Box>
          )}
          {log}
          {run && !terminal && <Box component="span" sx={{ color: '#7ee787' }}>▍</Box>}
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
