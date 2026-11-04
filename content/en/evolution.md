### What changes when an agent learns

During its first CSV report, Hermes may need to inspect columns, clarify number formats and missing values, and adjust its answer after feedback. A later task can benefit by reading a revised procedure.

In this mechanism, self-improvement updates persistent facts, skills, and supporting materials. It does not require changing the base model's trained weights. Editing `SKILL.md` changes the instructions supplied to future work.

Ask three questions: which durable object changed, how will a later task read it, and did that task improve? A sentence claiming “I learned” answers none of them by itself.

### Follow one complete example

The teaching input is:

```text
Date,Region,Sales
2026-11-01,East,100
2026-11-02,South,
2026-11-03,East,120
```

The user requires valid amounts only, with missing values excluded and counted rather than filled with zero. The expected sum is 220, valid count 2, missing count 1.

Suppose the first attempt replaces missing values with zero. Its sum happens to remain 220, but it violates the policy; averaging would expose a larger difference. Therefore one correct number is not sufficient acceptance evidence.

The user points out the filled zero. Hermes recalculates and reports a sum of 220, two valid amounts, and one exclusion. That settles this report. Hermes then asks, “Should I use this rule for your future sales reports too?” The user confirms, “Yes. By default, exclude missing sales and report how many you excluded. I’ll tell you if a particular report should fill them with zero.”

That confirmation gives Hermes a standing rule for the sales-report skill. Without it, the transferable step is to ask which missing-value policy the report requires.

### Six links from feedback to later use

1. **Obtain grounded feedback.** Use user correction, real tool output, or acceptance checks. The agent liking its own answer is not enough.
2. **Choose the right home.** A cross-task language preference can go to `USER.md`; temporary totals stay in history; CSV procedures and report conventions belong in the skill.
3. **Read related existing skills.** Locate the misleading step before editing it. Create a new skill only when an existing one cannot reasonably contain the task class.
4. **Apply a usable revision.** `skill_manage` updates concrete steps, conditions, and verification. Supporting scripts, templates, and paths form one package. A write may still await approval.
5. **Read it in future work.** Discovery metadata helps selection; the body loads on invocation or relevant reading. A disk update does not silently replace an earlier copy already present in the current conversation.
6. **Verify a variation.** Use another CSV with different missing values. Check sum, valid count, excluded count, and invalid-number handling.

A skill contains lessons that remain useful beyond one incident. Dates, trial-by-trial narratives, and repeated copies of the same rule belong elsewhere. [Knowledge routing](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/prompt_builder.py)

### A procedure that can be followed

This is teaching content, not a verbatim production skill:

```markdown
## Procedure

1. Read column names and confirm the numeric field; do not guess by position.
2. Confirm the missing-value policy. For this report class, exclude missing sales and report the count unless the current user specifies otherwise.
3. Sum valid parseable numbers. Report nonempty invalid values separately.
4. Return the sum, valid count, missing count, and the applied policy.

## Verification

For 100, missing, 120: sum 220, valid count 2, missing count 1.
Also check an input containing a nonempty invalid number.
```

The next session can act on inputs, ordered steps, and acceptance conditions. It does not need to replay the whole debugging story.

### Foreground learning and background review

Foreground learning is part of an explicit current task, such as “update the existing skill with the verified approach.” Its tool call and result are visible work.

Background review uses a conversation snapshot after an eligible turn to consider memory or skill updates. It runs an independent agent context rather than inserting a hidden reflective user message into the active delivery loop. This fork is a runtime context, not a Git branch.

The current triggers use different counters: memory review counts user turns; skill review counts tool-calling iterations. Relevant defaults are 10. Reaching a threshold is only one condition: enablement, tool availability, turn outcome, and execution mode also matter. Some finite or unattended paths skip automatic review. A review need not create a new skill.

A single long user turn may accumulate enough tool iterations for skill review, while many short chat messages may contain no reusable procedure. [Review triggers](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/turn_finalizer.py)

### Protect the live conversation

The review branch uses its own run state and a snapshot. Its durable writes do not require rebuilding the main conversation's existing system prompt, old messages, or tool definitions.

Same-model review can preserve a compatible cached prefix; actual cache reuse still depends on the service. Routing review elsewhere changes that assumption and uses more compact input. Review consumes requests and tokens even when it does not save anything.

An execution-side whitelist limits review actions separately from the inherited tool definitions kept for cache consistency. Exposing a schema and permitting a particular background run to execute it are different decisions. [Fork and whitelist](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/background_review.py)

### Avoid learning the wrong rule

A browser request times out once, then succeeds on retry. A grounded lesson may concern how to check and retry that failure. “Browser tools never work” turns a temporary condition into a persistent refusal.

Save verified transferable rules, not a failed sequence dressed as best practice. When a rule is wrong, fix the misleading sentence in place, then verify a variation. Repeated “UPDATE: actually…” paragraphs can leave contradictory instructions together.

### Controls act on different mechanisms

| Control                               | Main purpose                                  |
| ------------------------------------- | --------------------------------------------- |
| `memory.write_approval`               | Review built-in memory writes                 |
| `skills.write_approval`               | Review agent skill mutations                  |
| `auxiliary.background_review.enabled` | Enable automatic post-turn review             |
| `curator.enabled`                     | Enable library maintenance                    |
| `curator.consolidate`                 | Opt into the curator's LLM organization phase |

Disabling one does not imply disabling the others. `/memory pending` and `/skills pending` show staged writes. `/refine` explicitly reviews recent experience; `/learn` reads specified sources or a verified procedure to produce reusable skill content. Both still require actual reading and successful writes.

For example, after verifying the CSV report, ask `/learn` to update the relevant skill with its missing-value policy and checks. Inspect the resulting tool actions, handle pending approval, then use a new session and a new input. `/journey` or `hermes journey` can show learning activity, but a new node is not a correctness certificate. [Learning from sources](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/user-guide/features/skills.md#learning-a-skill-from-sources-learn)

### Curator maintenance is a separate loop

The curator tracks eligible skill activity and runs when maintenance conditions allow. Current source defaults mark stale after 14 inactive days and archive after 30. Checks occur at maintenance time, not necessarily at the exact anniversary. Stale remains usable; archives can be restored.

These are activity rules, not accuracy scores. Explicit management markers, pinning, and task-reference protection affect eligibility. `created_by: agent` means management policy, not proven authorship. Pin protects archival-related behavior; lock restricts agent changes. Optional LLM consolidation is off by default. [Maintenance](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/curator.py)

### Evaluate improvement rather than accumulation

Prepare examples with no missing values, some missing values, and nonempty invalid numbers. Keep the model and settings fixed while comparing skill revisions. Measure correct outputs, policy adherence, tool iterations, time, and tokens.

Include new inputs not used to revise the skill, and optionally compare with the skill unloaded. More skills may mean useful coverage or merely duplication. A successful small experiment supports those conditions, not every possible CSV task.

### Test your reasoning

**Questions:** Does one report's department ordering belong in a universal user preference? Is a staged skill change already applied? Does pin imply the agent cannot edit a skill? Must model weights change when a new session performs better after reading a revised skill?

<details>
<summary>Compare your reasoning</summary>

A one-off order is not a universal preference; a durable report-class convention belongs in its skill. A staged change awaits approval. Pin and lock protect different behavior. New context can change performance without retraining model weights.

</details>
