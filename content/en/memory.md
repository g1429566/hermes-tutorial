### Observe what forgetting means

Suppose you say, “Default to Chinese in future; use English when I explicitly ask.” Hermes answers the next question in Chinese. That alone does not demonstrate persistent memory: the instruction is still in the current conversation.

Start a genuinely new session with `/new`, then ask an unrelated question. For the preference to reach that new session, information must cross the session boundary. Built-in persistent memory provides one such path.

An iteration is one model-request pass. A turn is one user request and its response, potentially containing several iterations. A session can contain many turns. Restarting a program may resume an existing session; restart and new session are not equivalent.

### Storage and model input are different

A model uses the context supplied in its request. A file existing on disk does not imply its contents were supplied. Memory files, historical databases, and skills each need an actual read path.

| Information                | What it holds                                            | How it reaches model context                                |
| -------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Live conversation          | Recent instructions, results, pending work               | Included in the current conversation; may be compressed     |
| Built-in persistent memory | A small set of durable facts and user preferences        | Read at session startup into a fixed system-prompt snapshot |
| Stored conversations       | Previous discussions, concrete errors, decision evidence | Session recovery or `session_search` reads relevant records |
| Skills                     | Procedures, decisions, pitfalls, verification            | Explicit invocation or relevant on-demand reading           |

Working, episodic, semantic, and procedural memory are useful conceptual labels. They are not four obligatory runtime stages in one Hermes container. First identify the real object, its lifetime, and its read/write timing.

### Two built-in files

`USER.md` holds stable user facts and preferences. `MEMORY.md` holds environment facts and standing conventions useful across tasks. A procedure for a particular class of work belongs in its skill rather than consuming memory loaded into every new conversation.

Both files live under the current profile's `<Hermes home>/memories/`. A default POSIX installation commonly uses `~/.hermes/memories/`; platform defaults, custom homes, and named profiles can differ. Check the active profile before inspecting a same-named file.

Default capacities are 2,200 characters for `MEMORY.md` and 1,375 for `USER.md`, configurable in memory settings. Characters are not tokens. The mapping depends on language and model.

A small budget keeps always-loaded input focused. A long incident log is better retrieved when relevant than included in every unrelated task. [Built-in implementation](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/memory_tool_store.py)

### Trace a save into the next session

Assume user memory is enabled, approval is not pending, and the preference is absent initially.

1. Session A starts and reads existing files. Its initial snapshot has no language preference.
2. The user states the durable preference. It first becomes an ordinary user message.
3. The model calls `memory` with `target: user` and a compact factual entry.
4. A successful tool operation persists the entry in `USER.md`. The result reports what happened.
5. A's initial system-prompt snapshot remains unchanged. A can still use the recent instruction and tool result.
6. New session B reads the updated file and includes the preference in its own initial snapshot.

| Moment                  | Disk               | A's initial snapshot | New evidence in A                  |
| ----------------------- | ------------------ | -------------------- | ---------------------------------- |
| A starts                | No preference      | No preference        | None                               |
| User states it          | Still absent       | Unchanged            | Explicit user request              |
| Tool saves successfully | Preference present | Unchanged            | Request and actual save result     |
| B starts                | Preference present | Still unchanged      | B now has its own updated snapshot |

An already-running C also keeps its earlier snapshot unless explicitly refreshed. Waiting a few seconds is not a refresh mechanism. Persistence writes durable state; a snapshot is a particular read of that state.

### Why keep the snapshot fixed

Supporting model services can reuse an already-processed identical request prefix. Rebuilding the early system prompt after every save can reduce that reuse. Hermes separates writing future knowledge from rewriting the active conversation's established context.

The current session does not lose the user's new instruction: it is still in recent messages. Cache invalidation has no universal billing multiplier. Provider pricing, model, cached range, and context size determine the cost.

### Edit actual entries

The current tool offers `add`, `patch`, and `remove`, with an explicit top-level `target` of `user` or `memory`. There is no separate `read` action; initial injection and tool results provide the relevant views.

This JSON describes tool arguments, not a system-terminal command:

```json
{
  "action": "add",
  "target": "user",
  "content": "User defaults to Chinese and requests English explicitly when needed."
}
```

For a separate example, assume an entry already says “User defaults to Chinese; report dates include timezone.” After the user changes the default language, a partial update can be:

```json
{
  "action": "patch",
  "target": "user",
  "old_text": "defaults to Chinese",
  "content": "defaults to English"
}
```

The date convention survives. `old_text` must identify the intended entry and occur only once within it. Ambiguous matches are rejected; supply more context rather than guessing. `remove` deletes the identified whole entry.

Older `replace` overwrote an entire matched entry. It is no longer offered by the current tool. Do not copy that old action into a new-version exercise or interpret partial `patch` as the old whole-entry operation. [Tool semantics](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/memory_tool_store.py)

### Verify writes and handle capacity

“I will remember” is generated text, not evidence of persistence. Inspect actual tool results and the correct file. With write approval enabled, some writes wait in a pending queue. Unattended background changes to existing memory have additional staging rules. `staged` means awaiting review, not applied.

Use `/memory pending`, then inspect and approve or reject the actual identifier. A pending change must not be treated as knowledge already stored. [Write controls](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/skill_manager_guards.py)

Overflow does not silently erase old entries. The model must inspect, shorten duplicates, or remove outdated facts before saving useful new information. Combining two copies of the same language preference is more sensible than deleting an unrelated date convention at random.

The `operations` batch interface applies one top-level target and checks capacity against the resulting state. Use separate calls for different targets. Start with single-entry operations, then use the batch form when the real error requires coordinated edits.

### Retrieve historical details

To answer “Which encoding fixed last week's CSV problem?”, compact memory may be insufficient while stored conversation messages retain the evidence. `session_search` searches or reads those records. FTS5 is SQLite's full-text indexing facility; it finds text using indexed terms rather than supplying a universally semantic user model.

Arguments determine discovery by query, reading by session identifier, scrolling around a message anchor, or browsing recent sessions. Results are stored messages and metadata, not an LLM-generated replacement for the evidence. Missing search results do not prove an event never occurred.

Historical findings can also be stale. Verify a remembered server address against current state when the task depends on it. Default profile scope and explicit cross-profile access are distinct; sharing a machine does not make every history automatically visible. [Search implementation](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/session_search_tool.py)

### Optional external memory

External providers can add richer retrieval or user modeling, for example through a Honcho-type backend. Here provider means a memory implementation, distinct from a model-inference provider.

`MemoryProvider` supports initialization, static prompt material, per-turn recall and synchronization, and lifecycle hooks. Preparing one user turn is not the same as recalling before every internal model iteration. Dynamic recall should not be taught as rewriting the old system prompt on every request.

Plugins have their own storage, network dependencies, retention, and cost. Built-in files work without an external provider, and their controls are distinct. [Provider integration](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/memory_provider.py)

### Run a bounded local check

Use a learning profile, not daily production memory.

1. Inspect `/profile` and identify its home and `USER.md`.
2. Explicitly request a `memory` save of the future language preference.
3. Inspect the real call result. Handle a pending proposal if present; no call or a failure is not a saved entry.
4. Read that profile's file and verify the entry.
5. Start a new session with `/new`, ask an unrelated question, and check loaded preference information as well as behavior. One Chinese answer alone is weak causal evidence.
6. Explicitly request English this time. Following that request is compatible with the saved conditional preference.

No disk entry points to writing or approval. A present entry absent from new context points to profile, enablement, or session-start issues. A loaded entry not followed points to wording, conflicts, or execution quality. Diagnose the stage rather than declaring all memory broken.

### Predict before revealing the explanation

**Questions:** A and C already exist when A saves a preference; B starts afterward. Which initial snapshot includes it? Does “Use English for this report” justify changing a permanent language default? Where should a specific old error log be retrieved?

<details>
<summary>Compare your reasoning</summary>

B starts with the new entry; A and C do not automatically refresh their initial snapshots. A still has its recent messages. A one-report instruction is not evidence of a permanent preference. Specific logs belong in historical retrieval, not always-loaded user memory.

</details>
