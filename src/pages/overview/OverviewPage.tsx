import { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { createIssue, wakeupAgent } from "../../apis/paperclip/api";
import type { CreateIssueInput } from "../../apis/paperclip/types";

export function OverviewPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleCreateIssue() {
    setLoading(true);
    setResult(null);

    const agentId = import.meta.env.VITE_WORKER_AGENT_ID as string;
    const input: CreateIssueInput = {
      title: "New Task from dashboard",
      description:
        "I have javascript project which is here /Users/brian/Downloads/Maverick 50110223362. I want you to run all the steps js in that folder. For the credentials you can use them as well. If steps are not working for some reason, use your Maverick skill and fix it.",
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
    </Stack>
  );
}
