# Timegrain

*Harvest your time, grain by grain*

A Pomodoro timer plugin for [Obsidian](https://obsidian.md) with task tracking, energy logging, and productivity analytics. Port of the [flowtime](https://github.com/your-repo/flowtime) Python TUI.

## Features

### Timer
- Start/pause/resume/stop/complete timer sessions
- Pomodoro tracking with configurable duration (default 25 min)
- Audio notification on pomodoro completion
- Status bar integration
- Session recovery on startup

### Task Management
- Create tasks with title, status, estimation, energy level, category
- Plan your day: batch-select tasks to move to "Today"
- Fuzzy search to quickly find and start tasks
- Auto-rollover of stale "Today" tasks to "This Week"

### Energy Tracking
- Rate energy level (1-5) after each session
- Track hour-of-day and day-of-week patterns
- Analyze peak productivity times

### Daily Log
- Interactive calendar with activity heat map
- Timeline visualization of work sessions
- Color-coded by task
- Navigate to any date to review history

## Installation

### From Obsidian Community Plugins
*(Coming soon)*

### Manual Installation
1. Download `main.js`, `manifest.json`, `styles.css` from the latest release
2. Create folder: `<YourVault>/.obsidian/plugins/timegrain/`
3. Copy the files into that folder
4. Restart Obsidian
5. Enable "Timegrain" in Settings → Community plugins

## Usage

### Commands
Access via Command Palette (Ctrl/Cmd + P):

| Command | Description |
|---------|-------------|
| **Start timer with current note** | Start timing the active file |
| **Start timer: Select task...** | Fuzzy search to pick a task |
| **Pause/resume timer** | Toggle timer pause |
| **Complete timer session** | Finish and log energy level |
| **Stop timer** | Stop without completing |
| **Open timer panel** | Show timer in sidebar |
| **Open daily log** | Calendar + timeline view |
| **Create new task** | Open task creation form |
| **Plan your day** | Select tasks for today |

### Data Storage
- **Tasks**: Markdown files in `*/tasks/*.md` with YAML frontmatter
- **Sessions**: Stored in `timer_sessions/` folder

Compatible with flowtime data format for seamless migration.

## Configuration

Settings available in Settings → Timegrain:

- **Timer sessions directory**: Where session files are saved
- **Default task directory**: Where new tasks are created
- **Cycle duration**: Pomodoro length in minutes
- **Daily goal**: Target pomodoros per day
- **Play sound**: Audio on pomodoro completion
- **Show status bar**: Timer in status bar
- **Rollover stale tasks**: Auto-move old "Today" tasks

## Development

```bash
# Install dependencies
npm install

# Development with watch mode
npm run dev

# Production build
npm run build

# Run tests
npm test

# Deploy to vault
./deploy.sh
```

## License

MIT
