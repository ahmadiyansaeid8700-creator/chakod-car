<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Chakod continuity rules

Before inspecting or changing this repository, read `AI_HANDOFF.md` completely. It is the authoritative operational handoff for the current staging branch, deployment workflow, completed features, verified state, and exact next action.

- Do not rebuild the product from scratch.
- Treat `agent/launch-3-local-baseline` as the current staging source unless the deployment workflow proves otherwise.
- Do not assume `main` is the staging source.
- Check current code and tests before trusting older status documents.
- Preserve the locked homepage order and never restore the retired homepage banner or generic dealership fallback cards.
- Use a feature branch and a PR targeting the staging branch.
- Verify TypeScript, related contracts, production build, deployment, and the live staging asset before reporting completion.
- Update `AI_HANDOFF.md` at the end of every material session with the actual tests, PR, merge commit, deployment result, and next action.
