# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Timegrain** is an Obsidian plugin that recreates the Python [flowtime](~/code/flowtime) TUI application. It provides a Pomodoro timer with task tracking, energy logging, and productivity analytics.

Philosophy: *"Harvest your time, grain by grain"*

## Development Commands

```bash
# Install dependencies
npm install

# Development mode with watch/auto-rebuild
npm run dev

# Production build (TypeScript check + esbuild)
npm run build

# Run tests
npm test

# Deploy to vault (build + copy to Obsidian)
./deploy.sh
```

## Project Structure

```
src/
├── main.ts                    # Plugin entry point
├── types.ts                   # TypeScript interfaces
├── constants.ts               # Time constants, view types
├── settings.ts                # Settings interface and tab
├── context/
│   └── PluginContext.tsx      # React context for plugin access
├── hooks/
│   ├── useTimer.ts            # Timer state hook
│   ├── useTasks.ts            # Task data hooks
│   ├── useSessions.ts         # Session data hooks
│   └── useSettings.ts         # Settings hook
├── components/
│   ├── TimerDisplay.tsx       # Main timer UI
│   ├── GrainStack.tsx         # Pomodoro visualization
│   ├── ControlButtons.tsx     # Timer control buttons
│   ├── TaskSelector.tsx       # Task selection UI
│   └── CalendarView.tsx       # Daily log calendar
├── views/
│   ├── timer-view.tsx         # Sidebar timer view
│   └── dashboard-view.tsx     # Dashboard view
├── modals/
│   ├── energy-modal.ts        # Post-session energy rating
│   ├── task-suggest-modal.ts  # Fuzzy task search
│   ├── unfinished-session-modal.ts  # Session recovery
│   ├── new-task-modal.ts      # Task creation form
│   └── plan-day-modal.ts      # Daily planning
├── services/
│   └── timer-service.ts       # Timer state machine
├── data/
│   ├── frontmatter.ts         # YAML read/write utilities
│   ├── task-repository.ts     # Task file operations
│   └── session-repository.ts  # Session CRUD
└── utils/
    ├── datetime.ts            # Date/time utilities
    └── formatters.ts          # Formatting helpers

tests/                         # Vitest test files
styles.css                     # Plugin styles
```

## Key Features

- **Timer**: Start/pause/resume/stop/complete with pomodoro tracking
- **Task Management**: Create tasks, plan day, fuzzy search
- **Energy Tracking**: 1-5 scale rating after sessions
- **Daily Log**: Calendar with heat map and timeline visualization
- **Session Recovery**: Detect and resume unfinished sessions on startup
- **Status Bar**: Show timer in Obsidian status bar

## Data Format

Compatible with flowtime's YAML frontmatter format:

**Tasks** (`*/tasks/*.md`):
```yaml
title: Task Name
status: today | in progress | this week | this month | backlog
estimation: 3
expected energy: 4
category: work
creation date: 2024-01-15T10:00:00
```

**Sessions** (`timer_sessions/*.md`):
```yaml
started: 2024-01-15T10:00:00
ended: 2024-01-15T10:25:00
task: "[[Task Name]]"
energy_level: 4
hour_of_day: 10
day_of_week: monday
```

## Architecture Notes

### Timer Service
State machine: `idle → running ↔ paused → completed/stopped`
- Emits events: `start`, `pause`, `resume`, `stop`, `complete`, `pomodoro-complete`
- Persists state every 5 seconds for crash recovery

### React Integration
- Uses `createRoot()` to mount React in Obsidian's `ItemView`
- `PluginContext` provides access to plugin/app in components
- Custom hooks abstract repository access

### Task Repository
- Caches tasks in memory with debounced refresh
- Watches for file changes via Obsidian events
- Pattern: `*/tasks/*.md` (configurable)

## Commands

| Command ID | Name |
|------------|------|
| `start-timer` | Start timer with current note |
| `start-timer-select` | Start timer: Select task... |
| `pause-resume-timer` | Pause/resume timer |
| `complete-timer` | Complete timer session |
| `stop-timer` | Stop timer |
| `open-timer-view` | Open timer panel |
| `open-dashboard` | Open daily log |
| `create-task` | Create new task |
| `plan-day` | Plan your day |

## Deployment

Plugin files deployed to vault:
- `main.js` - Bundled JavaScript
- `manifest.json` - Plugin metadata
- `styles.css` - CSS styles

Vault location: `/mnt/c/Users/Linco/Documents/dev_vault/.obsidian/plugins/timegrain/`

Run `./deploy.sh` to build and copy files to the vault.

## Testing

Tests use Vitest with mocked Obsidian API:
- `tests/__mocks__/obsidian.ts` - Mock implementations
- `tests/*.test.ts` - Test files

Run `npm test` to execute all tests.

## Feature Parity

See `FEATURES.md` for detailed comparison with Python flowtime.
Current coverage: **92.5%** (74/80 features)
