---
description: "Review the current Git changes, draft a useful commit message, and create the commit after confirmation"
name: "Check In Changes"
argument-hint: "Optional context for the commit"
agent: "agent"
---
Review the current repository changes and check them in safely.

1. Run `git status --short` and inspect the relevant diff, including changed and untracked files. Do not include secrets, generated artifacts, dependencies, or unrelated user changes.
2. Summarize the actual change in one sentence. Mention tests or validation that were run, or say they were not run.
3. Draft a concise commit subject of about 50-72 characters using an imperative verb. If the change needs context, add a short commit body with complete sentences; otherwise use only the subject.
4. Show the proposed commit message and the files that will be staged. Ask for confirmation before staging or committing.
5. After confirmation, stage only the intended files and run `git diff --cached` to verify the staged content. Then create the commit with the approved message.
6. Report the commit hash, final subject, and any remaining changes. Do not push, merge, reset, or discard changes.

