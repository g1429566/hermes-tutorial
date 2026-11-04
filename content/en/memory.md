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

A model call to `memory` requires two top-level fields. `target` selects the store (`user` or `memory`). `operations` lists the changes to that store. Each list item has an `action` to add an entry (`add`), revise a span (`patch`), or delete a whole entry (`remove`). A single change uses a one-item list. The session reads saved notes at startup, and write results can show the current state. [Tool schema](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/memory_tool.py#L398)

Here are the arguments a model would send to save the language preference. In JSON, braces enclose an object and square brackets enclose a list. The one object in this list specifies the action and the text to save.

```json
{
  "target": "user",
  "operations": [
    {
      "action": "add",
      "content": "User defaults to Chinese and requests English explicitly when needed."
    }
  ]
}
```

For a separate example, assume an entry already says “User defaults to Chinese; report dates include timezone.” After the user changes the default language, a partial update can be:

```json
{
  "target": "user",
  "operations": [
    {
      "action": "patch",
      "old_text": "defaults to Chinese",
      "content": "defaults to English"
    }
  ]
}
```

The date convention survives. `old_text` must identify the intended entry and occur only once within it. Ambiguous matches are rejected; supply more context rather than guessing. `remove` deletes the identified whole entry.

Older `replace` overwrote an entire matched entry. It is no longer offered by the current tool. Do not copy that old action into a new-version exercise or interpret partial `patch` as the old whole-entry operation. [Tool semantics](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/memory_tool_store.py)

### Verify writes and handle capacity

“I will remember” is generated text, not evidence of persistence. Inspect actual tool results and the correct file. With write approval enabled, some writes wait in a pending queue. Unattended background changes to existing memory have additional staging rules. `staged` means awaiting review, not applied.

Use `/memory pending`, then inspect and approve or reject the actual identifier. A pending change must not be treated as knowledge already stored. [Write controls](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/user-guide/features/memory.md#controlling-memory-writes-write_approval)

Overflow does not silently erase old entries. The model must inspect, shorten duplicates, or remove outdated facts before saving useful new information. Combining two copies of the same language preference is more sensible than deleting an unrelated date convention at random.

To make room and save a new entry in one call, put all changes to that target in the same `operations` list. The tool checks capacity against the final state and commits the changes together. If the new entry would still overflow, the earlier removal is rolled back. Use a separate call for the other target.

### Retrieve historical details

To answer “Which encoding fixed last week's CSV problem?”, compact memory may be insufficient while stored conversation messages retain the evidence. `session_search` searches or reads those records. FTS5 is SQLite's full-text indexing facility; it finds text using indexed terms rather than supplying a universally semantic user model.

Arguments determine discovery by query, reading by session identifier, scrolling around a message anchor, or browsing recent sessions. Results are stored messages and metadata, not an LLM-generated replacement for the evidence. Missing search results do not prove an event never occurred.

Historical findings can also be stale. Verify a remembered server address against current state when the task depends on it. Default profile scope and explicit cross-profile access are distinct; sharing a machine does not make every history automatically visible. [Search implementation](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/tools/session_search_tool.py)

### Optional external memory

External providers can add richer retrieval or user modeling, for example through a Honcho-type backend. Here provider means a memory implementation, distinct from a model-inference provider.

`MemoryProvider` supports initialization, static prompt material, per-turn recall and synchronization, and lifecycle hooks. Preparing one user turn is not the same as recalling before every internal model iteration. Dynamic recall should not be taught as rewriting the old system prompt on every request.

Plugins have their own storage, network dependencies, retention, and cost. Built-in files work without an external provider, and their controls are distinct. [Provider integration](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/agent/memory_provider.py)

### Run a bounded local check

Complete the command-line installation in chapter 01 first. A profile has its own configuration and user data. Create a fresh profile called `memory-lab` so you can start with empty memory.

1. **Create a profile in the system terminal.** Run `hermes profile create memory-lab`. If the name already exists, choose an unused name and substitute it for `memory-lab` in every command below.
2. **Configure its model.** In the terminal, run `hermes -p memory-lab model`. The `-p` option selects the profile for this command. Choose a provider you can access, follow its authentication prompts, and select a model that supports tool calls.
3. **Start session A.** Run `hermes -p memory-lab chat` in the terminal. At the Hermes chat prompt, enter `/profile`. Confirm the selected profile name and note its home directory.
4. **Request a durable save.** In chat, ask “Use the memory tool to remember that I prefer Chinese by default. Use English when I explicitly ask.” Inspect the tool result. If you see an approval prompt, read and confirm the entry. If the result says `staged: true`, enter `/memory pending`, then `/memory approve <id>` with the displayed ID and check the approval result.
5. **Check the file.** Open the home directory from step 3 in your file manager. Open the `memories` folder, then `USER.md` in a text editor, and look for the preference. If the entry is missing, check the write outcome and target from step 4. If the tool reports that user memory is disabled, inspect the setting in a second system terminal with `hermes -p memory-lab config get memory.user_profile_enabled`.
6. **Observe a fresh session.** Back in the Hermes chat, enter `/new`, then ask “Give me one tip for naming a file.” Observe the response language. Now ask “Please answer the same question in English this time.” Record the file entry as evidence of persistence and the two responses as evidence of behavior. A model might choose Chinese independently, so a single answer is only a clue.

[Create and use a profile](https://github.com/NousResearch/hermes-agent/blob/9302ba9e212c63ba24cdf1f47f26b47bcd3b042e/website/docs/user-guide/profiles.md#quick-start)

### Predict before revealing the explanation

**Questions:** A and C already exist when A saves a preference; B starts afterward. Which initial snapshot includes it? Does “Use English for this report” justify changing a permanent language default? Where should a specific old error log be retrieved?

<details>
<summary>Compare your reasoning</summary>

B starts with the new entry; A and C do not automatically refresh their initial snapshots. A still has its recent messages. A one-report instruction is not evidence of a permanent preference. Specific logs belong in historical retrieval, not always-loaded user memory.

</details>
