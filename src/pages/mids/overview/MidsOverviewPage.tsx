import { useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useMids } from './useMids';
import { useMidChecks } from './useMidChecks';
import { MidsList } from './MidsList';
import { MidChecksTable } from './MidChecksTable';
import { createIssue, wakeupAgent } from '../../../apis/paperclip/api';
import type { CreateIssueInput, Issue } from '../../../apis/paperclip/types';
import { LiveRunModal } from '../../overview/LiveRunModal';
import { SYNC_MID_ISSUE } from '../../../constants';
import type { MidRecord } from './types';
import { ToggleTabs } from '../../../components/common/tabs/ToggleTabs';

type MidsTab = 'all' | 'info';

export function MidsOverviewPage() {
  const { mids, loading, error } = useMids();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [tab, setTab] = useState<MidsTab>('all');

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

      <ToggleTabs<MidsTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'All MIDs', count: mids.length },
          { value: 'info', label: 'MID Information' },
        ]}
        sx={{ mb: 2 }}
      />

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

      {!loading && !error && tab === 'all' && (
        <MidsList mids={mids} onSync={handleSync} syncingId={syncingId} />
      )}

      {!loading && !error && tab === 'info' && (
        <MidChecksPanel mids={mids} onSync={handleSync} syncingId={syncingId} />
      )}

      <LiveRunModal
        open={!!activeIssue}
        onClose={() => setActiveIssue(null)}
        issue={activeIssue}
      />
    </Box>
  );
}

function MidChecksPanel({
  mids,
  onSync,
  syncingId,
}: {
  mids: MidRecord[];
  onSync: (mid: MidRecord) => void;
  syncingId: string | null;
}) {
  const { checks, loading, error } = useMidChecks();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary">Loading MID checks...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>;
  }

  return <MidChecksTable checks={checks} mids={mids} onSync={onSync} syncingId={syncingId} />;
}
