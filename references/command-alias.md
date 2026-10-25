---
name: neef-{{command}}
description: "Run Neef's {{command}} command. Use only when explicitly invoked."
disable-model-invocation: true
---

# NEEF {{command}}

Complete Neef's {{command}} workflow and save or report the result required by that route.

Read `../neef/SKILL.md`, resolved relative to this skill directory, as the canonical workflow instructions. Follow its {{route}} with all supplied arguments, including flags. Resolve its references relative to the canonical `neef` directory. Execute the workflow directly; no second skill invocation or user confirmation is needed to enter the route. Its permissions, safety checks and stopping conditions still apply. If the canonical file is unavailable, report the missing path and stop.
