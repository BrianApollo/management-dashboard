import { useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useMids } from './useMids';
import { MidsList } from './MidsList';
import { createIssue, wakeupAgent } from '../../../apis/paperclip/api';
import type { CreateIssueInput, Issue } from '../../../apis/paperclip/types';
import { LiveRunModal } from '../../overview/LiveRunModal';
import { SYNC_MID_ISSUE } from '../../../constants';
import type { MidRecord } from './types';

export function MidsOverviewPage() {
  const { mids, loading, error } = useMids();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  async function handleSync(mid: MidRecord) {
    setSyncingId(mid.id);
    setResult(null);

    const agentId = import.meta.env.VITE_WORKER_AGENT_ID as string;
    const { title, description } = SYNC_MID_ISSUE(mid.name);
    const input: CreateIssueInput = {
      title,
      description,
      assigneeAgentId: agentId,
      projectId: import.meta.env.VITE_PAPERCLIP_PROJECT_ID as string,
      status: 'todo',
    };

    try {
      const issue = await createIssue(input);
      await wakeupAgent(agentId, { source: 'assignment', reason: `Issue ${issue.identifier} assigned` });
      setResult({ type: 'success', message: `Created ${issue.identifier} and woke agent` });
      setActiveIssue(issue);
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to create issue',
      });
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>MIDs</Typography>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading MIDs...</Typography>
        </Box>
      )}

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {result && (
        <Alert severity={result.type} sx={{ mb: 2 }} onClose={() => setResult(null)}>
          {result.message}
        </Alert>
      )}

      {!loading && !error && (
        <MidsList mids={mids} onSync={handleSync} syncingId={syncingId} />
      )}

      <LiveRunModal
        open={!!activeIssue}
        onClose={() => setActiveIssue(null)}
        issue={activeIssue}
      />
    </Box>
  );
}
