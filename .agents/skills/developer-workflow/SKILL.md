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

---

## 🎨 UI/UX & Responsive Modal Standards (Continuous Learning)
1. **Brand Palette Compliance**:
   - Primary brand red: `#cc1111`, dark red hover: `#b00f0f`, soft red tint: `#fef2f2`, border: `#e2e8f0`, dark slate typography: `#0f172a`.
   - Never introduce dark teal or unharmonized theme colors into the core white & red INTEQC experience.

2. **Bulletproof Modal Flexbox Scrolling**:
   - **Problem**: In CSS Flexbox, children default to `min-height: auto`. When expandable elements (accordions) expand inside a flex modal with `overflow-y: auto`, the container often traps scrolling, pushes footers off-screen, or clips the bottom content. Furthermore, pinned headers/footers create dead zones that swallow mouse wheel events, and iOS Safari can freeze touch scrolling if `overscroll-behavior: contain` is combined with locked body scroll.
   - **Mandatory Pattern**:
     - **Outer Overlay**: `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; overflow-y: auto; -webkit-overflow-scrolling: touch;`
     - **Modal Container**: `margin: auto; max-height: min(90dvh, 800px); display: flex; flex-direction: column; overflow: hidden;` (use `dvh` for mobile viewport chrome tolerance).
     - **Header**: `flex-shrink: 0;` (always pinned at top).
     - **Scrollable Body**: `flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: pan-y;` (avoid `overscroll-behavior: contain` on iOS Safari).
     - **Footer**: `flex-shrink: 0;` (always pinned at bottom).
     - **Wheel Event Forwarding**: Attach an `onWheel` handler on the modal container to forward scroll delta (`modalBodyRef.current.scrollTop += e.deltaY`) whenever mouse wheel rolls over pinned headers or footers, eliminating scroll dead zones.
     - **Auto-scroll on Accordion Expand**: When user clicks to expand accordion items at the bottom of the body, automatically trigger `scrollIntoView({ behavior: 'smooth', block: 'end' })` so revealed items are immediately visible.
     - **Mobile Responsive Wrapping**: Widgets embedded into headers/dashboards must use `flexWrap: 'wrap'` and centered alignment to prevent horizontal overflow on narrow mobile screens (320px–480px).

