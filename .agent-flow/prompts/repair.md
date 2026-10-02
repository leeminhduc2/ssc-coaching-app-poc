You are repairing an implementation that failed independent validation.

PHASE

{{PHASE_JSON}}

TEST FAILURE REPORT

{{TEST_REPORT}}

ATTEMPT

{{ATTEMPT}} / {{MAX_RETRIES}}

RULES

- Diagnose the actual root cause before editing.
- Modify production code only.
- Do not modify, remove, skip or weaken tests.
- Do not change acceptance criteria.
- Do not work around tests with special-case behavior.
- Keep changes within the assigned phase scope.
- Do not perform unrelated refactors.
- Do not commit.

If you believe a test contradicts the phase specification, do NOT modify
the test. Record the disagreement as TEST_DISPUTE.

Write the repair report to:

{{REPAIR_REPORT_PATH}}

The report must contain valid JSON:

{
  "phase": "...",
  "attempt": 0,
  "status": "repaired | blocked | test_dispute",
  "root_cause": "...",
  "changed_files": [],
  "changes": [],
  "remaining_concerns": []
}

When complete reply only one of:

REPAIR_COMPLETE

REPAIR_BLOCKED

TEST_DISPUTE