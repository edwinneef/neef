# Competitors

Researched 2026-11-02. Most of these facts come from third-party reviews and aggregators, and they sometimes disagree on prices, versions and star counts. Check the official sites before quoting any figure.

## At a glance

| Tool | Type | Where it runs | Who it's for | How work starts |
| --- | --- | --- | --- | --- |
| **NEEF** | Skill for Claude Code and Codex | Your machine, in your own agent | Anyone, for new or existing projects | One request; NEEF picks the stack, builds, verifies and commits |
| **Lovable** | Hosted app builder | Browser and Lovable cloud | Non-developers making web apps | Prompt to a React + Supabase app |
| **Bolt.new** | Hosted app builder (StackBlitz) | Browser (WebContainers) | Prototypes and small to medium apps | Prompt to a full-stack app inside the browser |
| **Replit Agent** | Hosted IDE agent | Replit cloud (desktop preview on Windows) | Builders who want hosting included | Prompt to an app; parallel tasks in Agent 4 |
| **Spec Kit** | Open-source workflow toolkit (GitHub) | Your machine, 30+ agents | Developers who want specs before code | `specify init`, then spec → plan → tasks → implement |
| **BMAD Method** | Open-source multi-agent framework | Your machine (Claude Code, Cursor and others) | Teams that want agile artifacts | Analyst, PM and architect agents produce PRDs and stories before dev agents build |
| **Superpowers** | Open-source skills pack (obra) | Your machine, in Claude Code | Developers who want disciplined habits | Brainstorm → plan → TDD implementation, as skills |

## Notes per tool

- **Lovable:** Full-stack web apps from prompts. Includes GitHub sync, one-click deploy and code export. Pricing is based on credits, and reviewers call it hard to predict. A free tier exists.
- **Bolt.new:** Runs the whole Node.js stack in the browser. Offers Standard and Max agents, Supabase and Stripe integrations, Figma import and GitHub export. Pro costs about $25/month with token limits. Reviewers say success rates fall on complex apps, and large prompts can use a lot of tokens.
- **Replit Agent:** Building, hosting and deployment in one product. Agent 4 (2026) adds parallel tasks. Workspace instructions and skills came in mid-2026, then automatic model routing. It releases often (several times a month).
- **Spec Kit:** MIT-licensed. Built on a project "constitution" plus slash commands for each step. Agent-neutral. It is the most widely adopted spec-driven tool (90k+ stars reported).
- **BMAD Method:** MIT-licensed. Simulates a full team of role agents (reported counts range from 12 to 21+) and offers many guided workflows. Planning documents are the main output that guides the build. Reviewers say it carries a lot of paperwork for small tasks.
- **Superpowers:** MIT-licensed. Available in the official Claude Code plugin marketplace since January 2026. It covers process discipline (brainstorming, plans, TDD, debugging) and doesn't bootstrap projects.

## Where NEEF differs

1. **Compared with the hosted builders (Lovable, Bolt, Replit):** NEEF keeps code and Git on your machine, runs in the agent you already pay for, and works in existing codebases with their current stack. It has no hosting or deploy layer. Those products include one.
2. **Compared with the workflow frameworks (Spec Kit, BMAD, Superpowers):** NEEF goes straight from a request to verified, committed work. It needs no spec or PRD first and no per-project setup. Planning (`plan`, `shape`) is optional, not a required gate. Its continuity is shared between Claude Code and Codex.
3. **Shared ground:** Spec Kit and BMAD also work across agents. Superpowers covers similar ground to NEEF's verify-and-commit discipline, inside Claude Code.

## Sources

- Lovable: [The CTO Club review](https://thectoclub.com/tools/lovable-review/), [Banani pricing breakdown](https://www.banani.co/blog/lovable-pricing-and-credits)
- Bolt.new: [DEV review 2026](https://dev.to/jovan_chan_9500711396d4e6/boltnew-review-2026-browser-based-full-stack-apps-the-token-cliff-and-who-should-actually-pay-26fd), [Automation Atlas review](https://automationatlas.io/answers/bolt-new-review-2026/), [Never Code Alone](https://nevercodealone.de/vibe-coding/vibe-coding-tools/bolt-new-ki-app-builder-stackblitz-webcontainers-2026)
- Replit Agent: [Havoptic changelog](https://www.havoptic.com/tools/replit-agent), [DEV review 2026](https://dev.to/incubadora_6c1fc80706dda7/replit-ai-features-review-2026-is-it-worth-it-5920)
- Spec Kit: [Visual Studio Magazine](https://visualstudiomagazine.com/articles/2025/09/03/github-open-sources-kit-for-spec-driven-ai-development.aspx), [DEV deep dive](https://dev.to/x4nent/github-spec-kit-deep-dive-spec-driven-development-the-constitution-speckit-slash-commands-1m71), [2026-05 overview](https://ice-ice-bear.github.io/posts/2026-05-13-github-spec-kit/)
- BMAD: [Augment Code guide](https://www.augmentcode.com/guides/bmad-method-ai-development), [Nitor Infotech 2026 guide](https://www.nitorinfotech.com/blog/what-is-the-bmad-method-a-complete-guide-to-ai-driven-software-development-in-2026/)
- Superpowers: [Trevor Lasn](https://trevorlasn.com/blog/superpowers-claude-code-skills), [mcp.directory 2026](https://mcp.directory/blog/superpowers-skill-worth-it-2026)
