---
name: ui-ux-pro-max
description: 'Design and implement high-impact, production-ready UI/UX for web interfaces. Use for new screens, UX redesigns, interaction polish, responsive improvements, and accessibility hardening. Includes branching logic for existing design systems versus new visual directions, plus deployment-quality validation gates.'
argument-hint: 'What screen, flow, or component should be designed or upgraded?'
user-invocable: true
---

# UI/UX Pro Max

## What This Skill Produces
- A clear UX direction for a target screen or flow.
- A concrete implementation plan that balances aesthetics, usability, and maintainability.
- Production-ready UI updates with responsive behavior, accessible interactions, and validation checks.

## Operational Defaults
- Scope default: workspace-scoped (this file lives in `.github/skills/ui-ux-pro-max/`).
- Execution default: full multi-step workflow unless the user explicitly asks for a fast pass.
- Visual policy default: preserve existing design system patterns first; shift to bold redesign only when requested or when no coherent system exists.

## When to Use
Use this skill when requests include terms like:
- "improve UI"
- "redesign"
- "polish UX"
- "make this look premium"
- "improve responsiveness"
- "fix usability"
- "accessibility pass"
- "better layout/hierarchy"

## Inputs to Confirm
If not explicitly provided, gather these before implementation:
1. Target surface: page, component, or end-to-end flow.
2. Primary user goal: what users must accomplish quickly.
3. Scope constraints: timebox, tech stack, and no-go areas.
4. Design context: existing design system to preserve or freedom to create a new direction.
5. Acceptance standard: quick checklist versus full production-grade workflow.

If any input is missing after one pass of context gathering, proceed with safe defaults and state assumptions in output.

## Workflow
1. Audit Context
- Inspect current UI structure, component usage, typography, color tokens, spacing system, and interaction patterns.
- Map user pain points: confusing hierarchy, weak affordances, inconsistent spacing, poor readability, weak mobile behavior.

2. Choose Design Strategy (Branch)
- Branch A: Existing design system present.
  - Preserve established component patterns and token semantics.
  - Improve clarity, hierarchy, and ergonomics without breaking visual consistency.
  - This branch is the default when system signals are mixed.
- Branch B: No stable design system.
  - Define a distinct visual direction with explicit typography, color tokens, spacing scale, and component states.
  - Avoid default-looking, generic layouts.

3. Define UX Priorities
- Identify the primary action and reduce competing visual noise.
- Establish information hierarchy: what users see first, second, and third.
- Ensure critical actions are obvious on desktop and mobile.

4. Design Interaction Model
- Set clear states: default, hover, active, focus, disabled, loading, error, success.
- Add meaningful motion for transitions and reveals.
- Keep interactions purposeful, not decorative.

5. Implement with Reusable Structure
- Prefer tokenized styles and reusable primitives over one-off styling.
- Keep modifications localized and avoid broad unrelated refactors.
- Ensure component APIs stay stable unless change is required.

6. Accessibility and Content Pass
- Verify keyboard navigation and visible focus indicators.
- Check color contrast for text and controls.
- Confirm semantic structure and clear microcopy for errors, empty states, and confirmations.

7. Responsive and Edge-State Pass
- Validate key breakpoints and touch targets.
- Test empty, long-content, and loading states.
- Prevent layout jumps and overflow regressions.

8. Validation Gates
- Run typecheck and tests for impacted apps.
- Run production build for affected frontend package.
- Confirm no new errors introduced by UI changes.

## Quick Checklist Mode
Use this abbreviated path only when users ask for speed over depth.
1. Confirm target surface and primary user action.
2. Fix top 3 hierarchy/usability issues.
3. Ensure mobile readability and touch-safe actions.
4. Verify focus visibility and contrast on changed elements.
5. Run at least typecheck and one relevant test/build gate.

## Decision Points
- Preserve existing patterns or establish new visual language?
- Is this a focused component polish or full flow redesign?
- Should motion be minimal for clarity or richer for onboarding/value signaling?
- Are accessibility fixes mandatory in this pass or can any be explicitly deferred?

## Completion Criteria
A task is complete when all are true:
1. UI hierarchy is clear and intentional.
2. Primary user actions are obvious and easy to complete.
3. Desktop and mobile behavior are both verified.
4. Loading, error, and empty states are handled.
5. Accessibility basics are covered (focus, contrast, semantics).
6. Typecheck/tests/build pass for affected surfaces.

## Example Prompts
- /ui-ux-pro-max Improve the dashboard hero and KPI cards so they feel premium and scan faster on mobile.
- /ui-ux-pro-max Redesign the checkout form flow for fewer errors and clearer completion steps.
- /ui-ux-pro-max Polish this settings page while preserving the current design system and component library.

## Suggested Follow-on Customizations
- Create a companion prompt for "UI copy and micro-interaction writing".
- Create a file-scoped instruction for responsive spacing and typography standards.
- Create a testing-focused skill for visual regression and accessibility checks.
