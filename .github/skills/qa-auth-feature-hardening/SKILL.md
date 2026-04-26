---
name: qa-auth-feature-hardening
description: 'Adversarial QA and security testing for authentication, authorization, sessions, APIs, and full feature flows in JS/TS apps. Use when you need authentication testing, authorization testing, login/logout bug hunting, session issue triage, security testing, feature regression, hidden bug discovery, fault analysis, or test failure triage with fix recommendations.'
argument-hint: 'What system, feature, or release should be tested, and which risk areas are highest priority?'
user-invocable: true
---

# QA Auth Feature Hardening

## What This Skill Produces
- A risk-prioritized test strategy for authentication and all critical product features.
- A reproducible bug list with severity scores, root-cause hypotheses, and practical fix options.
- A validation and regression-hardening plan that verifies fixes and reduces repeat failures.
- A release-readiness decision with explicit residual risk.

## Operational Defaults
- Scope default: workspace-scoped, intended for shared engineering use.
- Depth default: full multi-step workflow (not checklist-only) unless user asks for a quick pass.
- Testing posture default: strict, adversarial, and deterministic.
- Solution format default: three levels for each major issue.
- Level 1: quick mitigation.
- Level 2: proper fix.
- Level 3: long-term hardening.

## When to Use
Use this skill when requests include terms like:
- authentication testing
- authorization testing
- login bug
- logout bug
- session issue
- token refresh failure
- password reset bug
- security testing
- feature regression
- hidden bug discovery
- fault analysis
- test failure triage

## Inputs to Confirm
If missing, infer from repo defaults and state assumptions.
1. Target scope: auth only, selected features, or full release sweep.
2. Environment: local, staging, production-like.
3. Primary risk focus: security, reliability, regression, performance, or abuse resistance.
4. Time budget: deep sweep vs fast confidence pass.
5. Evidence requirement: logs only, reproducible scripts, or automated failing tests.

## End-to-End Workflow

### Phase 1: Test Planning
1. Define assets and trust boundaries:
- Identity sources, tokens, session stores, role models, sensitive endpoints.
2. Build a risk map:
- Highest risk user journeys and attacker paths.
3. Select coverage mode:
- Full release gate.
- Incremental feature gate.
- Incident-driven fault investigation.
4. Create traceability:
- Link each risk to one or more explicit tests and expected outcomes.

### Phase 2: Environment and Data Setup
1. Prepare deterministic fixtures:
- Known users, roles, devices, tokens, and invalid states.
2. Seed edge-case data:
- Expired tokens, revoked sessions, disabled users, malformed payloads.
3. Enable observability:
- Request IDs, auth decision logs, rate-limit counters, and error taxonomies.
4. Validate environment parity risks:
- Config drift, feature flags, clock sync, secrets rotation status.

### Phase 3: Exploratory and Hidden Bug Discovery
Run multiple discovery approaches in parallel where possible.

1. Exploratory charters:
- Drive risky end-to-end journeys with unexpected user behavior.

2. Property-based testing:
- Assert auth/session invariants such as:
- Invalid or expired credentials never gain access.
- Revoked tokens are never accepted.
- Role constraints remain stable across retries and refresh cycles.

3. Fuzz testing:
- Mutate headers, token shapes, payload sizes, content types, and encodings.

4. Stateful or model-based testing:
- Validate multi-step auth flows across state transitions:
- signup -> verify -> login -> refresh -> logout -> revoke -> relogin.

5. Concurrency and race testing:
- Parallel login, refresh, revoke, and privileged actions.
- Detect stale authorization windows and non-atomic state updates.

6. Fault injection and chaos checks:
- Network jitter, packet loss, DB latency, cache misses, message delays, clock skew.

7. Mutation testing of tests:
- Confirm tests fail when critical auth checks are intentionally weakened.

8. Differential testing:
- Compare behavior across environments, build flags, and fallback paths.

9. Pairwise and combinatorial inputs:
- Cover high-dimensional forms and policy combinations efficiently.

10. Time-boundary testing:
- Token expiry edges, timezone boundaries, daylight-saving transitions.

### Phase 4: Core Test Execution Matrix

#### Authentication
- Signup, login, logout, token refresh.
- Password reset, account lock, MFA enrollment and challenge.
- OAuth and social login callback and state validation.

#### Authorization
- Role-based access controls.
- Horizontal and vertical privilege escalation attempts.
- Tenant and resource ownership checks.

#### Session Security
- Expiration, renewal, revocation, global logout.
- Concurrent sessions, device or IP changes, replay resistance.
- Session fixation and token reuse checks.

#### API Security
- Input validation, schema enforcement, boundary values.
- Rate limiting, brute-force throttling, abuse heuristics.
- IDOR, injection classes, CSRF/CORS policy behavior.

#### Feature Coverage
- CRUD flows.
- Search, filter, sort.
- File upload and content handling.
- Notifications, settings, profile, dashboard workflows.

#### Cross-Cutting
- Validation quality and error consistency.
- Retry behavior, offline handling, timeout fallbacks.
- Performance under sustained and burst load.

#### Negative and Abuse Cases
- Malformed or tampered tokens.
- Expired links and stale actions.
- Duplicate requests and idempotency violations.

### Phase 5: Bug Capture and Triage
For each defect, capture:
1. Repro steps and preconditions.
2. Expected vs actual behavior.
3. Logs, traces, request IDs, screenshots, failing test evidence.
4. Probable root-cause hypothesis.
5. Scope blast radius and impacted personas.

### Phase 6: Root Cause Hypothesis
Classify root causes using one primary category:
- logic defect
- validation gap
- state synchronization issue
- configuration or environment drift
- dependency or integration failure
- observability blind spot

Require one disproof check for each hypothesis to avoid premature conclusions.

### Phase 7: Fix Recommendation
For each high-impact defect, provide three solution levels.

1. Quick mitigation:
- Reduce immediate user or security risk with minimal change.

2. Proper fix:
- Correct root cause with tests and compatibility considerations.

3. Long-term hardening:
- Architectural safeguards, telemetry, policy updates, and guardrail tests.

### Phase 8: Fix Validation
1. Re-run exact repro case.
2. Run nearby regression pack.
3. Re-run security and abuse checks for related surfaces.
4. Verify no performance regression against baseline.
5. Confirm telemetry detects and classifies the issue correctly.

### Phase 9: Regression Hardening
1. Convert critical repros into automated tests.
2. Add canary or smoke checks for release pipelines.
3. Update runbooks and failure signatures.
4. Record known weak points and monitoring thresholds.

## Decision Points and Branching Logic
1. Time-limited engagement:
- If timeline is tight, test highest risk journeys first, then broaden coverage.

2. Unknown failure source:
- If bug source is unclear, prioritize observability and differential testing.

3. Intermittent issues:
- If flaky or non-deterministic, run concurrency, fault injection, and timing tests.

4. Security suspicion:
- If exploitability is plausible, elevate severity and enforce immediate mitigation.

5. Multi-platform variance:
- If behavior differs across web and mobile, isolate API contracts before UI fixes.

## Severity Model
Score each issue with:
- User Impact (1-5)
- Exploitability (1-5)
- Business Risk (1-5)

Total score = User Impact + Exploitability + Business Risk

Classification:
- Critical: 13-15
- High: 10-12
- Medium: 7-9
- Low: 3-6

Escalation rule:
- Any authentication bypass, privilege escalation, or sensitive data exposure is Critical even if numeric score is lower.

## Fault-to-Solution Mapping
| Fault Pattern | Likely Cause | Quick Mitigation | Proper Fix | Hardening | Verification |
|---|---|---|---|---|---|
| Token accepted after logout | Revocation list not enforced | Block token family at gateway | Enforce revocation check on all guarded routes | Add centralized token introspection with cache invalidation tests | Reuse old token after logout must fail everywhere |
| Role bypass on specific endpoint | Missing authorization guard branch | Disable endpoint path via feature flag | Add policy middleware and ownership checks | Contract tests for policy coverage matrix | All role/resource combinations enforce policy |
| Refresh token replay | One-time token constraint missing | Shorten TTL and throttle refresh endpoint | Rotate refresh tokens atomically | Add replay detection telemetry and anomaly alerts | Parallel refresh attempts allow only one success |
| MFA challenge skipped | Client-only gating or weak server check | Force server-side MFA requirement | Bind MFA completion to signed server state | Add negative tests for direct API bypass | Direct privileged action without MFA fails |
| IDOR on resource IDs | Ownership validation absent | Restrict ID exposure temporarily | Enforce tenant and owner checks in service layer | Property tests for unauthorized resource access | Cross-user resource access always denied |
| Brute-force login succeeds | Rate limit gaps and weak lockout policy | Temporary aggressive throttling | Implement adaptive rate limits and lockouts | Add attack simulation in CI security lane | Attack script triggers blocks without false positives |

## Automation Guidance
1. Unit tests:
- Validate pure auth and policy logic, edge-case branches, and invariants.

2. Integration tests:
- Validate middleware plus persistence behavior for tokens, sessions, and roles.

3. API tests:
- Use Supertest or collection runners for positive, negative, and abuse scenarios.

4. End-to-end tests:
- Use Playwright or Cypress to validate real user auth and feature journeys.

5. Reliability tests:
- Add stress and race scenarios for login, refresh, and privileged actions.

6. Tooling fit for JS and TS stacks:
- Vitest or Jest for unit and integration.
- Supertest for HTTP layer validation.
- Playwright or Cypress for E2E and browser-state checks.

## CI Gate Strategy
Use layered quality gates:
1. Fast lane on every pull request:
- Critical unit, integration, and auth policy tests.
2. Security lane:
- Abuse checks, fuzz samples, and critical negative cases.
3. Nightly deep lane:
- Property-based, mutation, concurrency, and chaos tests.
4. Release gate:
- Full matrix plus top hidden-bug discovery charters.

Flaky test policy:
- Quarantine only with linked defect ticket and owner.
- Keep a strict retry cap and collect diagnostic artifacts.
- No silent ignore for auth and security tests.

## Reporting Requirements
Every report must include:
1. Executive summary.
2. Prioritized defect list by severity.
3. Reproducible steps and preconditions.
4. Expected vs actual.
5. Root-cause hypothesis and evidence.
6. Recommended mitigation, proper fix, and hardening.
7. Confidence level and residual risk after fix.

## Reusable Templates

### Defect Report Template
Title:
Severity:
Area:
Environment:
Preconditions:
Steps to Reproduce:
Expected Result:
Actual Result:
Evidence:
Blast Radius:
Workaround:

### Root Cause Template
Defect ID:
Primary Hypothesis:
Supporting Evidence:
Disproof Check:
Alternative Hypotheses:
Final Root Cause Decision:

### Fix Proposal Template
Defect ID:
Quick Mitigation:
Proper Fix:
Long-term Hardening:
Implementation Risk:
Backward Compatibility Notes:
Validation Plan:

### Retest Checklist
- Original repro now fails safely or passes correctly.
- Adjacent auth and session scenarios rechecked.
- Authorization matrix revalidated for touched endpoints.
- Abuse and negative tests re-run.
- Monitoring and alerts confirm expected behavior.

## Common Pitfalls
- False positives from unstable fixtures or shared test accounts.
- Environment mismatch between local, staging, and production-like configs.
- Flaky tests caused by timing assumptions and missing synchronization.
- Weak seed data that misses role and tenancy boundaries.
- Poor observability that prevents reliable root-cause isolation.

## Completion Criteria
A test engagement is complete only when all conditions are true:
1. Planned high-risk journeys are fully executed.
2. Critical and High defects have mitigation or fixes with owners.
3. Fixes are validated with deterministic evidence.
4. Regression suite includes new guard tests for discovered faults.
5. Residual risk is documented and accepted by stakeholders.
6. Release readiness decision is explicit: go, conditional go, or no-go.

## Example Prompts
- /qa-auth-feature-hardening Run a full release gate for auth and session security across web and mobile.
- /qa-auth-feature-hardening Investigate hidden bugs in token refresh and role enforcement with adversarial testing.
- /qa-auth-feature-hardening Triage failing login and password reset tests, propose fixes, and validate regressions.

## Suggested Related Customizations
- A prompt file focused on generating security abuse test cases from API specs.
- A file-scoped instruction for consistent auth logging and request correlation IDs.
- A companion skill for performance and load-testing bottleneck diagnosis.