# Start a new project fast

Done means the requested app or tool exists, its first working version is committed, and the user can run or open it right away. Speed comes from deciding, not asking.

## Decide the shape

`begin` reports `greenfield` for an empty repository and `gitInitialized` when it just created Git on main in an empty folder; mention the latter once. Choose a mainstream stack that fits the request and any preference the user stated, without asking. Prefer the fewest moving parts: plain HTML, CSS and JavaScript for a simple page; one established framework when the request needs routing, state or a server; built-in storage such as SQLite or files before a hosted database. Ask only for what inspection and defaults cannot settle, such as a paid service, an account or a brand decision, and suggest a default.

## Build the first working version

Scaffold only what the request needs. Run an official generator non-interactively when it saves real work, otherwise write the files directly. Installing the project's own dependencies is part of the task; global tools, system settings and external accounts still need the user. Add a `.gitignore` for dependencies and build output, and a short README with the run command. Use synthetic sample data rather than live services.

Verify the result the way a user would use it: build or test what exists, then start it and confirm it responds, for example by fetching its local URL. Commit this first working version before polishing, then continue in small committed increments.

## Hand it over running

When the host can keep a process alive, leave the app running on localhost and give its URL and how to stop it; otherwise give the exact run command. Recommend the next most valuable feature as the follow-up, not setup chores.

Once the first commit exists, the project is an existing project: keep the stack and patterns it now has.
