# Start a new project fast

Done means the requested app or tool exists, its first working version is committed, and the user can run or open it right away. Speed comes from deciding, not asking.

## Decide the shape

`begin` reports `greenfield` for an empty repository and `gitInitialized` when it just created Git on main in an empty folder; mention the latter once. Choose a mainstream stack that fits the request and any preference the user stated, without asking. Prefer the fewest moving parts: plain HTML, CSS and JavaScript for a simple page; one established framework when the request needs routing, state or a server; built-in storage such as SQLite or files before a hosted database. Ask only for what inspection and defaults cannot settle, such as a paid service, an account or a brand decision, and suggest a default.

## Build the first working version

Scaffold only what the request needs. Run an official generator non-interactively when it saves real work, otherwise write the files directly. Installing the project's own dependencies is part of the task; global tools, system settings and external accounts still need the user. Add a `.gitignore` for dependencies and build output, and a short README with the run command. Use synthetic sample data rather than live services.

Aim for a usable first version with one complete flow from input to visible result. For a booking app, that means creating a booking and finding it in the list, not just rendering a form. When the task needs saved data, use real local persistence and check that it survives the relevant reload or restart. Choose simple defaults for empty states and invalid input. Apply the existing UI/design guidance; make the message and main action clear without expanding the feature set. Hosted services, sign-in and deployment belong only when requested.

Verify the result the way a user would use it: build or test what exists, then start it and confirm it responds, for example by fetching its local URL. Check the requested flow and persistence where relevant; a successful start alone does not prove them. Use a browser when available to exercise the interface, and distinguish API/source checks from an interaction actually tried. Commit this first usable version before optional polish, then continue only within the requested scope. Avoid extra planning, infrastructure and repeated successful checks.

## Hand it over running

When the host can keep a process alive, leave the app running on localhost and give its URL and how to stop it; otherwise give the exact run command. Recommend the next most valuable feature as the follow-up, not setup chores.

Give the user the main action to try and briefly report its actual checks and any required gap. Preserve unfinished acceptance in the normal task state. Do not label illustrative timelines or one successful fixture as a general speed or quality guarantee.

Once the first commit exists, the project is an existing project: keep the stack and patterns it now has.
