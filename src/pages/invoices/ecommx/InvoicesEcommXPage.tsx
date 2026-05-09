import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useEcommXInvoices } from './useEcommXInvoices';
import { EcommXInvoiceStats } from './EcommXInvoiceStats';
import { EcommXInvoiceList } from './EcommXInvoiceList';
import { EcommXInvoiceDetail } from './EcommXInvoiceDetail';
import { UploadFileModal } from '../../../components/common/upload';
import type { EcommXInvoiceRecord } from './types';

const PAYMENT_PROOF_FOLDER = 'payment-proof';
import { createIssue, wakeupAgent } from '../../../apis/paperclip/api';
import type { CreateIssueInput, Issue } from '../../../apis/paperclip/types';
import { LiveRunModal } from '../../overview/LiveRunModal';
import { CHECK_NEW_INVOICES_ISSUE, UPLOAD_PAYMENT_PROOF_ISSUE } from '../../../constants';

export function InvoicesEcommXPage() {
  const { invoices, loading, loadingMore, error } = useEcommXInvoices();
  const [selected, setSelected] = useState<EcommXInvoiceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  async function runIssue(title: string, description: string) {
    setActionLoading(true);
    setResult(null);

    const agentId = import.meta.env.VITE_WORKER_AGENT_ID as string;
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
      setActionLoading(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">EcommX Invoices</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            disabled={actionLoading}
            onClick={() =>
              runIssue(CHECK_NEW_INVOICES_ISSUE.title, CHECK_NEW_INVOICES_ISSUE.description)
            }
          >
            {actionLoading ? 'Running…' : 'Check New Invoices'}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<UploadFileIcon />}
            disabled={actionLoading}
            onClick={() => setUploadOpen(true)}
          >
            Upload Payment Proof
          </Button>
        </Box>
      </Box>

      {result && (
        <Alert severity={result.type} sx={{ mb: 2 }} onClose={() => setResult(null)}>
          {result.message}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading invoices...</Typography>
        </Box>
      )}

      {error && invoices.length === 0 && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}

      {!loading && (invoices.length > 0 || !error) && (
        <>
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Partial load: {error}
            </Alert>
          )}

          <EcommXInvoiceStats invoices={invoices} />

          {selected ? (
            <EcommXInvoiceDetail invoice={selected} onClose={() => setSelected(null)} />
          ) : (
            <EcommXInvoiceList
              invoices={invoices}
              selectedId={null}
              onSelect={setSelected}
            />
          )}

          {loadingMore && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                Loading more invoices…
              </Typography>
            </Box>
          )}
        </>
      )}

      <UploadFileModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        folder={PAYMENT_PROOF_FOLDER}
        title="Upload Payment Proof"
        onConfirm={async (url) => {
          setUploadOpen(false);
          const description = `${UPLOAD_PAYMENT_PROOF_ISSUE.description}\n\nPayment proof: ${url}`;
          await runIssue(UPLOAD_PAYMENT_PROOF_ISSUE.title, description);
        }}
      />

      <LiveRunModal
        open={!!activeIssue}
        onClose={() => setActiveIssue(null)}
        issue={activeIssue}
      />
    </Box>
  );
}
