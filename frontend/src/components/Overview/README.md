# Overview surface — per-integration-type rendering

The integration Overview page (`pages/Component.tsx`) renders one env card per
environment. What goes **inside** each card varies by **integration type**
(Integration as API, Automation, File Integration, …). This mirrors devant's
`components/Overview/` surface + slots pattern, adapted to ICP: our per-env
signal is the registered runtimes, not a cloud deployment.

## Structure

```text
Overview/
├── _shared/                       generic frame + dispatch — NO type-specific logic
│   ├── IntegrationRenderer.tsx    resolves the module key once, lazy-loads it,
│   │                              renders one EnvCardShell per environment
│   ├── EnvCardShell.tsx           the env-card FRAME. Owns ONLY shared state:
│   │                              runtime fetch + online/total status, refresh,
│   │                              settings drawer (MI runtime users), the MI
│   │                              Supporting-Artifacts view, and the selected
│   │                              entry point. Renders the module's slots.
│   ├── EntryPointsList.tsx        entry-point picker + detail, over the `kinds`
│   │                              the calling module asks for
│   ├── EntryPointDetail.tsx       per-artifact-type controls + inline content
│   ├── EntryPointActions.tsx      View Source / View Runtimes for the selection
│   ├── FileEventActions.tsx       listening artifact + status + Enable/Disable
│   │                              (+ View Parameters on MI) — file/event header
│   ├── InlineLogs.tsx             compact 24h runtime-log stream (file/event)
│   ├── bodies/FileEventBody.tsx   logs-only body shared by file- + event-integration
│   ├── EntryTypeChip.tsx          artifact-type tag used in the MI picker
│   ├── CopyButton.tsx             copy-to-clipboard icon button
│   └── entryPointUtils.ts         toEnabled(), EMPTY_ARTIFACTS, WRONG_TYPE_HINT
├── integration-as-api/            MI: RestApi + ProxyService · BI: Service
├── automation/                    MI: Task · BI: Automation
├── file-integration/              header = listening artifact; body = logs only
├── event-integration/             same shared slots as file-integration
├── default/                       every kind the runtime reports — used by the
│                                  untyped rows and by ai-agent / mcp-server
├── registry.ts                    module key → () => import('./<type>')
└── types.ts                       the slot-prop + OverviewModule contract
```

## What varies per type today

| Type               | Header actions                            | Body                              |
| ------------------ | ----------------------------------------- | --------------------------------- |
| Integration as API | View Source · View Runtimes               | RestApi + ProxyService / Service  |
| Automation         | View Source · View Runtimes               | Task / Automation (no schedule — see below) |
| File Integration   | artifact + status + Enable/Disable (+ Parameters on MI) | runtime logs only    |
| Event Integration  | same as File Integration                  | runtime logs only                 |
| AI Agent           | *default* — View Source · View Runtimes   | *default* — all kinds             |
| MCP Server         | *default* — View Source · View Runtimes   | *default* — all kinds             |

For the entry-point-shaped types, the detail panel already varies by the
*artifact* kind it lands on (`EntryPointDetail` + `artifact-config.tsx`):
resources and OpenAPI for services, executions for automations, status toggle +
Trigger for tasks. Narrowing the kinds per type is therefore what makes the whole
card change shape.

**Automations deliberately show less than devant's.** devant's automation card
has a cron banner, a next-run countdown, Schedule/Run buttons and per-env
insights. The runtime bridge reports an automation as
`MainDetail { packageOrg, packageName, packageVersion }` — no schedule, no
execution history — and its `ControlAction` enum is `START | STOP |
SET_LOGGER_LEVEL`, handled for listeners only, so there is no trigger either.
`bi_automation_artifacts` rows look like an execution log but are written once per
heartbeat that reports a `main`, stamped with the heartbeat's timestamp
(`heartbeat_repository.bal:791`) — they count heartbeats, not runs, and are
therefore **not** rendered. All of this needs a bridge release, not frontend
work; until then the card shows only what the runtime actually reports.

File and event integrations are the exception, and match devant's shape rather
than ICP's default one: devant gives them a header carrying the status and the
Stop/Start lever with the log stream as the entire body, because neither type
exposes a request contract. ICP has no deployment to stop, so `FileEventActions`
targets the equivalent lever — the inbound endpoint's own status on MI, and on BI
the listeners bound to the service (stopping a listener stops the service it
feeds). That slot owns its artifact fetch, since the body has no selection.

## The model in one line

`EnvCardShell` (frame + shared state) renders the module's **slots**:
`EnvCardActions` in the header (right of the env name, before Refresh) and
`EnvCardBody` as the card content.

| Slot             | Who provides it            | Example                                     |
| ---------------- | -------------------------- | ------------------------------------------- |
| `EnvCardBody`    | every type (required)      | entry-point list / executions / log stream  |
| `EnvCardActions` | types with header actions  | View Source · View Runtimes                 |

The shell passes shared per-env data (`runtimes`, `isOnline`, the component and
env, the drawer callbacks) to every slot via `EnvCardSlotProps`. Each slot
fetches its own **type-specific** data with the existing query hooks
(`useArtifacts`, …) — react-query de-dupes.

The selected entry point lives in the shell, not the body, because two slots
need it: the body sets it via `onEntryPointChange`, the actions act on it.

## Rules

- The module key is resolved **once**, by `registry.overviewModuleKey` (which
  wraps `constants/integrationTypes.integrationTypeFromStored` — the same
  resolver the header label and the create/edit flows use). Never re-derive it
  from `displayType`/`componentSubType` inside this directory.
- **Untyped rows are not narrowed.** `displayType === 'service'` is the server's
  default for any integration created without a type, so its real shape is
  unknown — an untyped MI integration may expose tasks or inbound endpoints.
  `overviewModuleKey` maps those to `untyped` → the `default` module, i.e. the
  exact Overview they had before per-type rendering existed. Setting the type
  from the header dropdown is what opts a row into a narrowed view.
- Type-specific code lives in the `<type>/` folder; shared chrome in `_shared/`.
  `_shared/` never imports a type folder.
- Shared bodies take **behaviour props**, not type flags.
- MI's "Supporting Artifacts" view is a *runtime* capability, not a type one, so
  it stays in the frame. While it is showing, the module's body and actions are
  both replaced by the artifact browser.

## Current state

Four types have their own module; `ai-agent` and `mcp-server` still point at
`default/` because their real bodies (an inline agent chat, the deployed
server's tool list) both need a server-side proxy to the deployed service that
ICP does not have yet — see `workflow_proxy_service.bal` for the pattern that
would provide it. `Record<OverviewModuleKey, ModuleLoader>` makes adding a type
a compile-time obligation.

## Adding a type module

1. Create `Overview/<type>/EnvCardBody.tsx` (+ `EnvCardActions.tsx` if it needs
   header buttons) against the contracts in `types.ts`.
2. Export them from `Overview/<type>/index.ts` as an `OverviewModule`.
3. Point that type's `registry.ts` entry at `() => import('./<type>')`.

Nothing else changes — the shell, the page, and the other types are untouched.
