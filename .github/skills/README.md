# Repository agent skills

These skills are available to GitHub Copilot agents in this repository. They are
guidance, not runtime dependencies; follow Capzee's existing architecture and
requirements when applying them.

| Skill | Purpose | Source |
| --- | --- | --- |
| `writing-plans` | Break a defined multi-step change into actionable implementation and verification steps. Adapted to use the host's available workflow instead of requiring companion Superpowers skills. | [obra/superpowers](https://github.com/obra/superpowers/tree/bb92a77741419a4ab5f06e711a283343f1ada0c3/skills/writing-plans) |
| `anti-ui-slop` | Design and review product-specific interfaces using the current product UI and design system. Its optional UIZZE integration is not required. | [github/awesome-copilot](https://github.com/github/awesome-copilot/tree/70ddff7fab9d4d49743d221b56d761cff58048d0/skills/anti-ui-slop) |
| `cloud-design-patterns` | Evaluate backend and distributed-system design tradeoffs without prescribing a cloud provider. | [github/awesome-copilot](https://github.com/github/awesome-copilot/tree/70ddff7fab9d4d49743d221b56d761cff58048d0/skills/cloud-design-patterns) |

The downloaded skills are pinned to the source revisions linked above. License
notices are retained alongside the corresponding skill files.
