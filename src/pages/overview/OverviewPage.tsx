import { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { createIssue, wakeupAgent } from "../../apis/paperclip/api";
import type { CreateIssueInput, Issue } from "../../apis/paperclip/types";
import { LiveRunModal } from "./LiveRunModal";

export function OverviewPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  async function handleCreateIssue() {
    setLoading(true);
    setResult(null);

    const agentId = import.meta.env.VITE_WORKER_AGENT_ID as string;
    const input: CreateIssueInput = {
      title: "New Task from dashboard to check Maverick",
      description:
        "You need to run Maverick skill that is assigned to you. If you don't find the skill just do nothing.",
      assigneeAgentId: agentId,
      projectId: import.meta.env.VITE_PAPERCLIP_PROJECT_ID as string,
      status: "todo",
    };

    try {
      const issue = await createIssue(input);
      await wakeupAgent(agentId, { source: "assignment", reason: `Issue ${issue.identifier} assigned` });
      setResult({
        type: "success",
        message: `Created ${issue.identifier} and woke agent`,
      });
      setActiveIssue(issue);
    } catch (err) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to create issue",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Command Center</Typography>
      <Box>
        <Button
          variant="contained"
          onClick={handleCreateIssue}
          disabled={loading}
        >
          {loading ? "Creating…" : "Create Issue"}
        </Button>
      </Box>
      {result && <Alert severity={result.type}>{result.message}</Alert>}
      <LiveRunModal
        open={!!activeIssue}
        onClose={() => setActiveIssue(null)}
        issue={activeIssue}
      />
    </Stack>
  );
}
