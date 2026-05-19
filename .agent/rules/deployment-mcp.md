## Deployment MCP usage

Rules:
- Use Vercel MCP and Render MCP only when the user explicitly asks to deploy.
- Do not call deployment MCP tools for general build, config, or code tasks.
- If deployment is requested, ask for required server details (URL, auth env vars) before proceeding.
