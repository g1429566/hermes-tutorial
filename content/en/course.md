# Learn Hermes through observable behavior

A paper exercise asks you to predict a result from stated conditions. A local exercise requires an installed Hermes instance. An interface simulation illustrates a mechanism; it does not operate your real agent. Treat the examples below as teaching examples unless a section explicitly asks you to run them.

## start How Hermes completes a task

Hermes is a personal AI agent that can use tools to carry out work. Here, an agent means a program that repeatedly chooses a next action, executes it, and observes the result while pursuing a goal. The language model proposes the next step; Hermes organizes the conversation, exposes tools, executes calls, and returns their results to the model. Available tools depend on the session, configuration, and execution environment.

The information supplied with a model request is its context. A system prompt supplies general instructions, conversation messages record requests and results, and tool definitions describe available actions. A document on disk does not become model context until something reads and supplies it.

Consider a teaching example: a bill contains breakfast 12, lunch 28, and dinner 25. The request is to read the bill and explain its total. The model first requests a file read. The runtime returns the three records. A calculation gives `12 + 28 + 25 = 65`, and the answer reports 65 with its basis. A filename alone would not justify that answer.

This creates a feedback loop: request an action, observe its result, then decide what to do next. A proposed call is not an executed call, and a successful read is not yet proof that the user's whole task is complete.

Hermes can also retain compact durable facts and reusable procedures. Its self-improvement path updates memory and skills for later use; completing a task does not automatically train the base model.

**Predict:** If reading the real bill fails, can the agent still justify reporting 65? **Check:** No. It must resolve the failed read or explain the missing evidence. The numbers in this example cannot stand in for the real file.

## map Follow one request through the repository

You do not need to memorize every directory. Follow the bill example instead: a user interface accepts the request, the agent core prepares context and calls a model, a tool reads the file, the result returns to the core, and the original interface displays the answer.

Entry points include the classic CLI, a richer terminal UI, the desktop app, and messaging platforms. CLI means a command-line interface. The TUI adds panels and interactive controls inside a terminal. Messaging adapters translate platform-specific messages. These entry points share an agent core while also owning input, session selection, approval presentation, and output formatting.

`run_agent.py` exposes `AIAgent`; topical modules such as `agent/turn_*.py` implement turn phases. `model_tools.py` and `tools/registry.py` connect tool discovery and dispatch. `toolsets.py` defines tool combinations. `tools/environments/` supplies terminal execution backends. `hermes_state.py` and its topical siblings manage persistent sessions.

A facade retains public entry points while related modules hold implementation details. Locate the topic and symbol first, then inspect its callers. Do not assume the largest entry file contains every feature.

**Check:** A Telegram formatting bug and incorrect file contents should not automatically be investigated in the same layer. Start with the platform renderer for formatting, and the file tool, execution target, and arguments for a bad read.

## features Choose capabilities from the task

A feature list helps you identify what a task needs. For a daily sales CSV report, tools read and calculate, a skill describes the procedure, a scheduler starts the job, a gateway delivers it, and user memory may carry a language preference. Each capability answers a specific requirement.

For a one-time sum today, an ordinary conversation and suitable tools may be enough. Enabling scheduling, multiple agents, and every integration adds configuration and failure modes without automatically improving the answer.

Think in three groups. Execution capabilities include files, terminal, browser, and media tools. Coordination includes sessions, delegation, schedules, and task boards. Reuse includes built-in memory, historical search, skills, and optional external memory providers. They can work together without being mandatory stages of every request.

The matrix is a learning map, not a live inventory. Check the installed version's setup, help, and official catalog for specific platforms, models, and plugins.

**Predict:** What must happen to total three expenses and reply here? **Check:** Obtain the real values, calculate and verify them, then return the result. File access, scheduling, or external delivery is needed only when the request actually requires it.

## install Install and verify the first conversation

Choose the platform-specific entry point first. macOS and Windows offer desktop packages. Command-line installations use the appropriate source installer. Android Termux has a dedicated APT path. The following commands apply to Linux, macOS, or WSL2; do not reuse shell configuration steps unchanged in PowerShell or Termux.

Run the official POSIX installer in a system terminal:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

The installer prepares Hermes and its managed runtime dependencies. After success, reopen the terminal or follow its shell-specific instructions. Opening a new terminal is clearer than guessing whether your shell uses `.bashrc` or `.zshrc`.

Next, run `hermes model`. Choose a provider and a model, then complete that provider's authentication flow. A provider supplies inference; a model is the particular model requested. An API is a programmatic service interface, and an API key is one possible credential. Some providers use a login flow instead.

Run `hermes doctor` to inspect the environment. An unconfigured optional integration does not necessarily block a first text conversation. Then run `hermes`, ask for a short response, and use `/help` inside the conversation. A text response verifies the model path; a separate tool exercise is needed to verify tool execution.

`hermes model` belongs in the system terminal. `/help` belongs in the Hermes chat input. Angle-bracket placeholders in documentation must be replaced with actual values.

**Diagnose:** Command not found suggests an installation or command-search-path issue. Authentication failure concerns the selected provider. A missing tool after successful chat concerns tool configuration, session availability, or dependencies. These are different stages.

## agent-loop Why one request can call the model repeatedly

A turn starts with a user request and ends with its response. An iteration is one pass through the model-call loop. A session can contain many turns. These units matter for budgets, memory review, and persistence.

In the bill example, the first model call requests the file. The runtime reads it and appends a result. A second call requests a calculation. The calculation returns 65. A third call writes the final explanation. A real model may combine steps; this example exposes the dependencies.

A tool call has a name, arguments, and a call identifier. Message roles identify user input, assistant output, and tool results. Each tool result must match its originating call. One assistant message can request several tools, followed by several tool messages. Consecutive tool results are therefore not inherently invalid.

If reads of A and B have identifiers 1 and 2, their contents must remain associated with those identifiers even when B finishes first. Association does not itself establish that the tool output is correct.

This is teaching pseudocode, not an executable Hermes source excerpt:

```text
prepare messages and tool definitions for the turn
repeat while budget remains and no stop is requested:
    request the model
    if it requests tools:
        execute them under runtime rules
        append a corresponding result for each call
    otherwise handle the text response and finish the turn
```

Ordered control flow can consume a streaming model response and execute independent tools concurrently. Streaming delivers content in chunks; concurrency overlaps eligible actions. Request transport, tool execution, and display have separate responsibilities. A final text response, a budget limit, an interrupt, and a failure are different outcomes.

Services commonly measure input and output in tokens: encoded units whose relation to characters varies. Stable earlier input can enable prefix-cache reuse on supporting services. Caching reduces repeated processing; it does not make the context window unlimited.

**Predict:** Two file calls were requested but only one result arrived. **Check:** Resolve or explicitly represent the missing result before summarizing both files. No tool calls in a later response does not prove the user's task passed verification.

## skills-1 How a skill guides tools

A tool performs an action; a skill explains how to organize actions for a class of tasks. A file reader does not know a sales report's missing-value policy merely from its tool name. A skill can specify checking columns, confirming missing values, calculating, and reporting counts.

A Hermes skill has a `SKILL.md` entry file. Markdown uses plain-text headings and lists. YAML frontmatter is a metadata block between opening and closing `---` lines. For example, `name: csv-report` assigns a name. Metadata helps discover the skill; the body supplies procedures and decisions.

The teaching skill `csv-report` could describe itself as “Summarize sales CSV files and verify excluded records.” That name is an example, not a promise that an installation already contains it.

The full path is discovery, relevant selection or explicit invocation, reading the body, choosing actual tools, and execution. A skill cannot bypass tool permissions or make a missing file or service exist.

A skill package may include deterministic helpers in `scripts/`, optional depth in `references/`, and output forms in `templates/`. Loading only relevant support material controls unrelated input. Repository contribution rules about description length, authorship, and platforms are separate from whether YAML parses.

**Check:** Placing a script in `scripts/` does not make it run automatically on every CSV. A trigger, an execution request, available tools, and permission are still required.

## skills-2 Maintain a growing skill library

A growing library can contain unused, overlapping, or outdated procedures even when every file parses. The curator maintains that library. Post-turn learning review is a different mechanism: it extracts possible updates from recent experience.

The current deterministic maintenance defaults mark eligible skills stale after 14 inactive days and archive them after 30. Thresholds are configurable and transitions happen when a permitted maintenance check runs. Stale skills remain usable; archival is recoverable.

For a paper exercise, assume a check is permitted, grace periods have passed, and A, B, and C are managed and unpinned. Their last activities were 3, 20, and 40 days ago. A remains active, B becomes stale, and C is archived. Pinning C or protection through a cron reference changes the result.

Activity is not a correctness score. Infrequent work can still be valuable; frequently viewed instructions can still be wrong. Content quality needs verification. The optional LLM consolidation phase is off by default and should not be described as part of every maintenance pass.

`created_by: agent` acts as a management-policy marker, not proof of historical authorship. Eligible skills can be explicitly adopted. Pinning protects archival-related behavior; locking restricts agent mutations. These controls serve different purposes.

**Predict:** Is a 40-day-unused skill necessarily already archived? **Check:** No. Maintenance timing, management eligibility, pinning, and task-reference protection also matter. A simulation evaluates one stated check, not every part of the real scheduler.

## tools From tool definition to execution

A tool definition describes its name, purpose, and parameter structure, also called its schema. A handler is the function the runtime executes with those arguments.

Keep four states separate: an implementation exists, it is registered, it is exposed to this model session, and a call succeeds. Registration, toolset selection, session capability, and prerequisites all affect availability.

For a file read, the model proposes a name and path; the runtime locates the handler, performs applicable checks, and returns contents or an error. Agent-owned and plugin tools have their own dispatch paths, so one generic function should not be presented as the literal path for every tool.

The model can propose several calls, while the runtime determines how eligible calls execute. Independent reads may overlap; writing A and then checking A requires ordering. The batch planner also considers path conflicts and tools that must remain sequential. Results retain their call associations and original collection order.

A toolset names a combination of tools. Unexposed tools are absent from the request's tool definitions. Exposed plugin tools still have input cost. Before adding a tool, check whether existing tools guided by a skill already solve the problem.

**Predict:** Which is more suitable for concurrency: independent reads of A and B, or modifying A and verifying the modification? **Check:** The independent reads are usually eligible; verification must observe the completed write. Actual admission still follows runtime rules.

## memory How information survives a new session

Read the complete memory lesson below: distinguish live context, built-in memory files, stored conversations, and skills. Then trace a successful write through disk persistence, the unchanged active-session snapshot, and the snapshot loaded by a new session.

Use the companion self-improvement chapter to connect saved experience to later task behavior. Do not substitute four abstract memory labels for the actual read and write paths.

## delegation Give a subtask its own agent context

Delegation suits relatively independent subproblems. Two agents can inspect unrelated modules while a parent compares their findings. The parent must provide the goal, relevant context, and expected output; a child does not automatically inherit the entire conversation.

Built-in `delegate_task` creates separate conversation context and terminal sessions. Children run the same basic loop and return results without flooding the parent with every intermediate message. Summaries save parent context but can omit evidence, so the parent still verifies important conclusions.

Separate context is not separate process or filesystem. Built-in batches can run in a thread pool. Two children modifying the same file may conflict. Use disjoint file scopes, directories, or worktrees when isolation of edits is needed, and choose an appropriate terminal backend.

An interactive runtime may return a dispatch identifier and deliver completion later. A finite or unsupported runtime may wait synchronously. A dispatch handle means dispatched, not completed. Concurrency, depth, and child budgets remain bounded by configuration.

**Predict:** Can “design the final interface” and “implement that final interface” simply run independently? **Check:** The implementation depends on the design. Early investigation can overlap, but committing to implementation before the contract stabilizes risks rework.

## gateway-1 Connect messaging platforms to one core

Telegram, Discord, Slack, and Feishu use different payloads and connection methods. An adapter translates those payloads into common message events and renders replies using platform capabilities. The core does not need a different task loop for each platform.

Follow a private message: the platform receives it, the adapter extracts text and attachments, the gateway selects a session and profile, the core runs the task, and the reply returns to its source. Source identity may include platform, chat, thread, and workspace.

Common processing does not imply common history. Session keys and routing determine whether users, threads, or workspaces share context. A single gateway process can host many distinct conversations. Sharing or handoff needs an explicit path.

Connecting a platform requires more than a token: configure identity, verify incoming routing, and test replies and controls. New adapters should use the provided plugin and platform-registration interfaces rather than teaching beginners to modify core gateway code.

**Check:** Identical text from two threads need not enter one session. Inspect source identity and routing, not just message contents.

## gateway-2 Route follow-ups and controls correctly

A new message can be a follow-up task or an immediate control. Ordinary follow-ups may queue while a session is busy. Stop commands and approval responses must reach the waiting handler promptly; otherwise an approval can end up waiting behind the action that needs it.

Trace an approval: a task starts, a tool requests permission, the user responds, the adapter recognizes the control input, the gateway sends it to the waiting approval path, and the tool proceeds or stops. Real implementations have several busy-session checks, so fixing only one queue may be insufficient.

Speech-to-text, or STT, commonly transcribes an incoming audio message before normal text handling. Text-to-speech, or TTS, produces outgoing audio. They are separate capabilities. Transcription errors in names, amounts, or instructions need checking or clarification.

Resuming reads saved conversation state. Handoff associates a conversation with another entry point and may need a configured destination or a thread. A running process can compare live and durable state; after a process restart, its old memory is gone and recovery depends on what was actually saved.

**Predict:** An approval is queued as an ordinary next prompt. **Check:** The current action may wait for approval while that approval waits for the action to finish. Deliver controls to their active recipients.

## cron Who starts the work when it is time

A scheduled job stores when to run and what to do. A scheduler later checks whether it is due. Saving a schedule neither runs it immediately nor guarantees execution while every relevant process is off.

For a daily sales report, confirm the timezone and meaning of 09:00, save the schedule and task, then let the due run create its execution session. The task must identify its input, missing-value policy, verification, and destination. “Do what you did yesterday” leaves essential inputs implicit.

In the current parser, `30m` and `every 30m` mean recurring intervals. `in 30m` means one run after that delay. The five fields in `0 9 * * *` mean minute, hour, day, month, and weekday: 09:00 each day in the scheduler's timezone, not every nine hours from now.

Different controls address different failures. Bounded catch-up handles missed times. Locks or claims reduce duplicate firing. Inactivity timeouts handle no progress. Iteration and token budgets address continuous activity that never completes. One timeout cannot stand in for all of them.

**Predict:** At 08:50, you want one reminder at 09:20. **Check:** Use `in 30m`, then verify timezone and an active scheduler. `30m` would recur.

## kanban Coordinate work with a persistent board

A persistent board is useful when work must survive restarts, wait on dependencies, or be assigned to different workers. A worker is the unit that actually executes a task. The board records task details, status, ownership, and run information.

Suppose A confirms CSV field mappings and B generates a report from those mappings. A can be claimed when ready. B must wait for a usable mapping; an idle worker does not remove that dependency.

Multiple workers need an atomic claim: checking availability and recording ownership occur as one indivisible state change, preventing both from believing they own A. Failed or abandoned claims also need detection and an explicit reclaim or retry policy.

Moving a card to Done in a teaching interface only demonstrates a state transition. A real system must verify the output, errors, retries, and dependencies. Board and tenant routing boundaries are distinct from operating-system or container permissions.

**Predict:** A report was written, but the worker crashed before recording completion. **Check:** A retry may write it again. Atomic claims limit simultaneous ownership; idempotence or output checks are still needed for safe retries. Idempotence means repeated execution avoids unintended duplicate effects.

## backends Where a terminal command really runs

The client interface, Hermes control process, and terminal execution environment may be on different machines. A laptop interface can connect to a server whose tools use SSH to execute elsewhere. Ask which environment a path belongs to before checking whether a file exists.

A local backend starts host processes. Docker uses a container. SSH uses a remote host. Cloud backends send work to their respective sandbox services, and plugins can supply other backends. A shared interface does not imply shared files, dependencies, permissions, or lifetimes.

For `data/sales.csv`, the local path is resolved from the execution directory. Docker requires that input to be visible inside the container. SSH resolves it remotely. Remembering the path string does not create a copy of the file at every destination.

Suspension and snapshots manage resource and filesystem lifetimes. Some services stop and resume a sandbox; others rebuild from a snapshot. Preserved files do not imply preserved memory processes, sockets, or every external resource. Storage and other charges can remain when no command is running.

**Check:** Seeing the CSV on your laptop does not prove an SSH backend can read it. Inspect the actual target and prepare a mount or transfer when needed.

## profiles Keep user state in the correct profile

A profile owns a distinct configuration and user-state scope. A work profile can use work credentials, skills, and conversations while a personal profile uses another set. This is a state-ownership mechanism, not automatically an operating-system account or a security container.

Let A store a Chinese work-report preference and B an English practice preference. A new session in A should read A's facts; B should read B's; returning to A should still select A. This A→B→A exercise can reveal leaks that a single-profile test misses.

Code resolves state through `get_hermes_home()`. A one-shot CLI can choose a profile before imports. A backend serving several profiles also needs request and background-work scope binding; its launch environment cannot identify every later task.

Credentials, history, skills, and memory follow their owning scopes. Explicit cross-profile access is a separate controlled path, not default inheritance. Listing all profiles is also different from reading the current profile's data.

**Predict:** A module caches A's directory at import time and later serves B. **Check:** B may read or write A's state. Resolve paths in the actual scope and propagate it into threads and child processes.

## tui Divide interface and backend responsibilities

The TUI presents messages, an input composer, activity, and approval prompts inside a terminal. TypeScript and Ink own rendering; the Python backend owns conversations, model calls, and tools. A new interface need not reimplement the agent in TypeScript.

JSON-RPC connects them. JSON represents structured data as text. RPC requests an operation on another endpoint. A request names a method, parameters, and identifier; a response uses that identifier. Events can carry message deltas or tool status.

When a user submits a prompt, the front end sends a request. The backend calls the model and publishes incremental content. For an approval, the backend can send a request in the opposite direction and wait for a UI response. The protocol is richer than one text message in each direction.

Width experiments illustrate layout: identical text wraps differently at 40 and 80 columns, invalidating line offsets. A simplified character wrapper does not model every wide character, combining mark, or terminal control sequence. Label it as a teaching approximation.

**Diagnose:** If backend deltas arrive but nothing appears, inspect subscriptions, session identity, state updates, and rendering before assuming the model produced nothing.

## cli Turn command names into behavior

A system command such as `hermes model` enters argument parsing. An in-chat command such as `/model` enters session command dispatch. They may share underlying services but are not interchangeable input strings everywhere.

A command registry records canonical names, aliases, descriptions, categories, and entry-point conditions. Deriving help and completion from common metadata reduces disagreement. Metadata still requires a handler that implements behavior.

For a teaching command, define metadata, implement its handler, connect appropriate entry points, and verify both discovery and execution. Persist settings only when they should survive sessions, and write them into the owning profile. A terminal-only command does not automatically acquire sensible messaging-platform semantics.

Changes to tools and skills must account for an active conversation's established prompt and tool definitions. Persisted settings can apply to later sessions; explicitly refreshing an active session has cache implications. A successful config write does not prove every open session changed.

**Diagnose:** A new alias appears in a menu but does nothing. Check normalization to the canonical name, handler routing, entry conditions, and argument transfer. Visibility verifies only part of the path.

## build-skill Write a skill another session can follow

Start with a repeatable task and its acceptance conditions. For CSV totals, specify columns, missing-value behavior, output sum, and excluded count. Then describe the ordered procedure and put it into a skill entry file.

A minimal teaching example is:

```markdown
---
name: csv-report
description: 'Summarize sales and verify excluded records.'
---

# CSV Report Skill

Summarize a sales CSV with named columns.

## Procedure

1. Confirm the numeric column and missing-value policy.
2. Read real data and explicitly report nonempty invalid values.
3. Calculate and report valid and missing record counts.

## Verification

For 100, missing, 120: sum 220, valid count 2, missing count 1.
```

This demonstrates structure, not a complete repository contribution. Add prerequisites, execution instructions, platform declarations, and appropriate validation under the actual contribution rules. A passing metadata form does not verify the procedure.

Look for an existing related skill before creating another. A helper script needs explicit inputs, a way to run it, and acceptance conditions; its presence alone does not teach the model how to use it.

**Check:** “Handle CSV correctly” is insufficient even with valid metadata. It lacks a missing-value rule, concrete steps, and a result that can be checked.

## build-tool Decide whether a new tool is warranted

First check existing capabilities. A CSV procedure can often be a skill using current file and terminal tools. A stable structured service interface may justify a plugin tool or MCP integration. A personal use case is not automatically a reason to expand core tool definitions.

Separate schema, handler, and prerequisite checks. A tiny echo handler can illustrate arguments and JSON results, but that does not make echoing worth a real core tool.

In the builder, inspect parameter names and types, then the generated handler, then success and failure inputs. Pyodide runs teaching code against stub infrastructure. It can verify a function result; it cannot prove real Hermes discovery, exposure, and end-to-end execution.

Real integration must exercise registration, exposure, prerequisites, dispatch, and result handling. A plugin uses plugin registration interfaces, while an internal core tool follows its own registry and toolset rules. Keep those paths distinct.

**Diagnose:** A handler works alone but the model cannot see it. Inspect registration, toolset selection, session availability, and dependency checks before changing the handler.

## build-provider Integrate a model provider

A provider integration needs authentication, an endpoint, a model catalog, and a translation between its API and Hermes messages and results. Similar chat features do not guarantee identical fields.

`ProviderProfile` centralizes provider metadata and relevant behavior. Many endpoints use Chat Completions; others use Responses, Anthropic Messages, or another transport. One teaching request shape is useful, but it is not proof that production uses only that API.

Trace a new provider: select it, authenticate, obtain a model list, choose a model with the required tool support, and run a minimal task. A fallback catalog can survive listing failure; appearing in that catalog does not prove the account can access the model.

Check streaming, tool arguments, reasoning fields, image input, and error handling when applicable. Authentication proves only one stage. Nonsecret behavior settings belong in configuration, while credentials require their secret-handling path.

**Check:** A successful text completion is insufficient to declare agent support. Verify a real tool call and result return, plus any promised media or streaming path.

## build-plugin Extend through the plugin surface

A plugin packages capabilities outside core code. Its manifest declares identity and kind, while its entry point registers tools, commands, or other capabilities through supported context interfaces. Different plugin kinds have different contracts; they are not all just six lifecycle callbacks.

For a project-statistics extension, first consider existing tools and a script. If a dedicated integration is warranted, register it through the generic surface and declare its setup and dependencies. A vendor-specific plugin should not silently modify the installed core.

Lifecycle hooks run logic at defined phases. Timing, accepted return values, failure handling, and whether the result can affect execution are contract details. A callback is not blanket permission to rewrite conversation history.

Plugins may execute in-process or in a host process. Process boundaries have compatibility limits and do not automatically provide container-style filesystem isolation. Validate the chosen plugin kind and actual configuration.

**Check:** If a memory plugin needs a capability, use an existing public interface or address a concrete generic gap. Do not teach it to patch `run_agent.py` as its installation mechanism.

## design-agent Assemble a system from requirements

Write acceptance conditions before picking components. Our teaching requirement is: read a sales CSV daily in a specified timezone, exclude missing amounts, report the sum and missing count in Chinese, stop and explain nonempty invalid values, and deliver to a configured chat. Input, output, errors, and destination are explicit.

Existing tools can read and calculate. A skill carries the reporting procedure. Built-in user memory can carry the language preference. Scheduling provides the trigger, and a configured platform provides delivery. Add delegation only for genuinely independent work; add a board when durable queuing or dependency management is required.

Deployment must say where data lives, where commands run, who owns credentials, which process schedules work, and where failures become visible. Running the control process locally does not automatically expose remote files, and moving it to a server does not expose laptop files.

Include a successful path and a failure path. If today's CSV never arrived, report missing input rather than presenting yesterday's result as today's success. Verify fixed examples instead of scoring the design by how many Hermes components it resembles.

**Exercise:** For one manual run today with a reply in the current chat, which parts can be omitted? A periodic schedule and extra delivery channel are usually unnecessary. Preserve real data access, clear rules, and verification.

## interview-loop Explain loop decisions with dependencies

Start an explanation with task dependencies. Reading informs calculation; calculation informs the answer. This supports ordered iteration. Independent reads can still overlap, and model responses can stream. “Synchronous is always simpler” is not a sufficient argument.

Explain call-result matching and prefix caching next. Appending new messages can preserve earlier input, while rewriting it can reduce cache reuse. Compression deliberately trades some detail and cache work for capacity. It is not free, and neither is cache invalidation a fixed billing multiplier.

Then cover exit paths: a completed answer, exhausted budget, an interrupt, or a request failure. A budget-closeout response does not prove success. Cancellation can involve network requests, running tools, and result cleanup, not just a flag checked between iterations.

**Exercise:** Why can an ordered loop read two files concurrently? Ordered phases preserve dependencies; eligible actions can overlap inside the tool phase, then return properly associated results. Those properties are compatible.

## interview-multi Choose a collaboration structure

Collaboration patterns describe task relationships; they are not five switches that every Hermes installation must enable. A manager splits and aggregates work. Handoff passes output through stages. A supervisor checks an artifact and sends feedback. A shared board coordinates workers. A queue can distribute many similar independent tasks.

Draw dependency arrows first. Two modules may be investigated independently. Implementation depends on a stable interface. Writing and review form a feedback loop. Ask who owns the goal, what each participant can see, who judges completion, and whether retries can duplicate effects.

Built-in delegation supports parent-child work; boards retain task state. Blocking after repeated failures is not equivalent to a semantic quality reviewer. Feeding a cron job another job's previous output does not alone establish a complete success-dependent workflow.

Set acceptance and stopping conditions for feedback loops. Task count alone does not determine topology: runtime, resource limits, coordination effort, and failure cost matter.

**Exercise:** For research→draft→citation review→revision, a staged handoff with a bounded review loop is reasonable. Define artifacts, criteria, and a revision limit. One agent following stages can also work; explain the additional benefit before adding agents.

## interview-design Write a design someone else can evaluate

Start with users, inputs, outputs, scale, and constraints. Explain the success path, then expand interfaces, stored state, and failure behavior. Every component should answer a requirement rather than decorate the diagram.

The requirement is a verifiable report at a stated time, not “add memory and a swarm.” Tools execute actions, skills reuse procedures, memory carries durable preferences, and scheduling triggers work. Whether a board helps depends on queuing and coordination requirements.

Describe each state's lifetime: when messages persist, when memory is read, when skills change, and when a task claim is released. Include a concrete failure, such as delivery succeeding before completion is saved, and explain how retries avoid duplicate notifications.

Define evaluation using correct totals, missing counts, invalid-input handling, repeated-delivery rates, latency, and cost. “Reliable” needs conditions and observable evidence.

**Check:** Separate context is not proof of complete data isolation. Filesystems, credentials, databases, and execution environments require their own boundaries.

## interview-checklist Assess observable understanding

Reading is not the same as explaining. For each topic, check whether you can describe the mechanism, trace one example, and adjust your prediction when a condition changes. A completion mark records study activity; it does not prove competence.

For memory, distinguish live context from persistent files, trace A saving and B starting, then predict what an already-running C sees. Knowing the filenames without explaining read timing leaves a specific gap.

For tools, explain schema and handler, trace registration through execution, then change one condition: unavailable dependency, wrong execution target, or registered-but-unexposed capability. Diagnose the failed stage rather than repeating terminology.

Keep a short spoken explanation or state trace as evidence. After an error, repair the missing concept and try a variation. Revealing a sample answer is not itself a demonstration of understanding.

**Exercise:** In five sentences, distinguish built-in memory, history search, and skills, then give one fact that should not be saved permanently. Judge purpose, read/write timing, and limits rather than the number of technical words used.

## reliability Match the response to the failure

Classify the failed stage first. A temporary model rate limit, excess context, invalid tool arguments, user cancellation, and failed persistence need different responses. Retrying everything immediately can add cost or duplicate effects.

A transient connection failure may warrant bounded retry. Invalid arguments need correction. Oversized input needs reduction or compression. User cancellation stops applicable work and preserves an accurate account of completed actions. A 429 does not by itself prove a zero account balance; use the actual provider error and runtime classification.

Turning a tool exception into a model-visible result helps recovery but is not compensation for every effect. Sending may succeed while its response is lost; repeating the send can duplicate a message. Query state or use an idempotency mechanism where available.

Inactivity limits address missing progress, wall-clock limits address total elapsed time, and iteration or token budgets bound consumption. An endlessly active loop may never trigger an inactivity limit. Logs support investigation, and approvals express authorization; neither guarantees correctness.

**Predict:** Will repeating a call with the same missing argument three times help? **Check:** Correct the argument first. If a send outcome is unknown, check its state before retrying.

## interop Identify the endpoints before choosing a protocol

Ask which two participants communicate. Hermes UI and backend use internal JSON-RPC contracts. An editor can drive an agent with ACP. An agent can consume tools and resources through MCP. Independent agent services can exchange tasks through A2A. Similar JSON payloads do not make these responsibilities identical.

MCP describes capabilities such as tools and resources; transport may be stdio or HTTP depending on the implementation. A server can internally call a function, database, or an agent. The protocol does not prohibit a model loop behind its interface.

ACP concerns editor-agent sessions, prompts, and permissions. A2A concerns independent services, tasks, and artifacts. Built-in delegation is often simpler for an internal temporary subtask. Check current plugin distribution before copying an old MCP-server installation command or catalog path.

**Choose:** An editor modifying code suggests ACP; a database-query tool suggests MCP; delegation to a separate agent service suggests A2A. A custom Hermes desktop interface uses Hermes' own backend contracts.

## compression Continue when the context grows too large

A context window limits what a model request can accommodate. Prefix caching can reduce repeated processing but does not remove that limit. History and tool results still consume space.

Start with cheaper controls: avoid irrelevant large results, retain useful excerpts, or store readable overflow references. When needed, compression forms a shorter representation of goals, confirmed findings, pending work, and information required to continue. Summaries lose detail, so preservation and verification matter.

Suppose history says to total valid sales, exclude missing values, and handle an unresolved invalid value in one file. “Processed the sales files” is an inadequate summary. Preserve the policy, completed scope, and unresolved item. Judge a summary by whether later action remains correct, not whether it reads smoothly.

A file checkpoint protects a different object. When enabled and applicable, it captures supported file changes for recovery. It does not undo sent messages, remote databases, or every running process. Compression, session recovery, and file rollback need separate explanations.

**Check:** A successful summary call does not guarantee preservation of every detail. Verify what continuation needs and consult stored evidence where necessary. File rollback cannot restore omitted conversational reasoning.

## routing Route main and auxiliary model work

Distinguish credential rotation within a provider, failover to a fallback model or provider, and selecting a model for an auxiliary task such as title generation, compression, vision, or review. Auxiliary routing is not necessarily a failure response.

After a rate limit, the runtime uses configuration and error classification to choose retry or another credential. A configured fallback may provide another path. Its context capacity, tools, or vision support may differ, so failover is not automatically behaviorally identical.

Auxiliary settings let different tasks use suitable models. A compression model must fit the material and preserve essential facts; low price alone is insufficient. Using another model can also change prefix-cache reuse.

Treat a routing diagram as versioned behavior. Verify selected configuration, authentication, model access, and task capability separately instead of memorizing a permanent list of provider names.

**Check:** A cheap fallback does not guarantee seamless continuation of a large visual task. Verify its window, vision, tools, and message-conversion path.

## multimodal Bring images and speech into the task

Multimodal requests and results can contain images, audio, and other content in addition to text. Tools and provider extensions organize these capabilities, but native visual requests can include image blocks in the model's messages.

For a sales chart, a compatible main model can analyze the image directly. An auxiliary vision path can instead return analysis material to the task. Extracted numbers can be wrong; obtain and verify the original table when precision matters.

Image generation creates a new image; understanding explains an existing one; editing requires a source and a requested change. Providers differ in parameters, latency, cost, and outputs, so a single image-URL condition does not explain every route.

Speech input often uses STT, and spoken output uses TTS. Transcription is evidence to check, especially for names and numbers. Fifteen versus fifty materially changes a calculation.

**Check:** An agent loop cannot guarantee the correctness of an incorrectly recognized number. Reinspect the image or original data, or ask for clarification.

## evaluation Measure whether the agent improved

Define success before running a batch. The CSV task needs the correct valid sum, missing count, invalid-value handling, and an explanation that follows the policy. Merely producing a response is insufficient.

Prepare fixed inputs with expected results and tool conditions. Record the model, configuration, skill revision, completion status, tool calls, latency, and cost. Separate conversations must not accidentally share mutable state that changes later tasks' conditions.

A batch runner executes and saves work; an evaluator judges it. Resume support does not automatically reverse external effects before a crash. A stored trajectory can support analysis or a separate training pipeline; saving it does not train the model.

To evaluate a skill revision, hold model and task settings fixed, compare before and after, and include unseen inputs. Report sample size, failure types, and cost rather than only counting saved skills.

**Predict:** Two sums pass, but nonempty invalid numbers are silently skipped. **Check:** The demonstrated sum cases passed; error handling still failed. Repair that rule and test an independent variation instead of incrementing a learned counter.
