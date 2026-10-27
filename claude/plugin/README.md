# My local Claude Code plugin

This plugin shares local agent skills, five task-specific agents, and lifecycle
hooks across Claude Code profiles. The skills directory links to the common
`.agents/skills` source instead of copying individual skills. Skills use the
`my:` namespace. Extra-context hooks load selected instructions for the main
conversation and subagents. Orca is not part of this plugin: profile synchronization
copies its existing registrations from the primary Claude profile.

This is a local working-tree plugin, not a marketplace submission. See
[`../README.md`](../README.md) for opt-in installation, profile synchronization,
memory cleanup, limitations, and isolated verification commands.
