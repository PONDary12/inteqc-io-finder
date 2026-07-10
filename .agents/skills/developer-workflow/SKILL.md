---
name: developer-workflow
description: Enforces a strict 7-step engineering workflow (Read, Explain, Plan, Incremental Fix, Verify, Diff, Commit) for every feature request or bug fix.
version: 1.0.0
---

# Strict 7-Step Developer Workflow

To ensure system stability and optimize token usage, Claude MUST follow this exact sequence for every task. Do not skip any step unless explicitly authorized by the user.

## 🔄 The 7-Step Execution Pipeline

### Phase 1: Discovery & Analysis
1. **[Skill 1: Read Project First]** Before writing or modifying any code, use grep, find, or file-reading tools to explore the existing codebase related to the task. Never assume the structure.
2. **[Skill 2: Explain Structure]** Output a brief, concise text map or explanation of how the related components, files, and data flow currently work. Prove that you understand the current state.

### Phase 2: Design & Strategy
3. **[Skill 3: Plan Before Action]** Present a bullet-proof, step-by-step implementation plan to the user *BEFORE* making any file modifications. 
   - State clearly which files will be created, modified, or deleted.
   - **CRITICAL:** Wait for the user to reply with "Approved" or give feedback before touching the code.

### Phase 3: Controlled Execution
4. **[Skill 4: Incremental Editing]** Do NOT rewrite entire files if minor edits are enough. Fix/Implement **one part at a time**. After finishing a small logical chunk, pause and check if it functions before moving to the next block.

### Phase 4: Quality Assurance
5. **[Skill 5: Run Build/Test/Lint]** Once the code changes are made, automatically execute the local project verification commands via the terminal (e.g., `npm run lint`, `npm run build`, or `pytest`). Fix any compiler or linter errors immediately.
6. **[Skill 6: Summarize Diff]** Provide a clean, human-readable summary of the `git diff`. Explain exactly what changed in plain English/Thai so the user can easily review.

### Phase 5: Version Control
7. **[Skill 7: Help Commit to GitHub]** If the build passes and the user is satisfied, draft a professional Conventional Commit message (e.g., `feat(io-table): add virtual scrolling for tower A`). Ask the user: *"Would you like me to commit these changes to GitHub now?"* Do not push without confirmation.

## 🚫 Critical Constraints
- Never execute widespread refactoring without a confirmed backup or git checkpoint.
- If a build/test fails at Step 5, loop back to Step 4 immediately to fix it.
