---
name: auto-continuous-learning
description: >-
  Autonomous Self-Learning Protocol: Mandates that the agent automatically records, updates,
  and refines project skills and rules whenever new domain insights, edge cases, root causes,
  or architectural patterns are discovered, without waiting for explicit user prompts.
---

# Autonomous Continuous Learning Protocol (SOP)

This skill mandates that **every paired programming session with Antigravity must compound knowledge**. Whenever a bug is investigated, an edge case is uncovered, or a new feature is delivered, the agent must autonomously capture the learnings directly into the codebase's skill repository.

---

## 1. Core Principle

> **Never learn the same lesson twice.**
> 
> If a bug took deep forensic analysis to diagnose, or a subtle regex flaw caused over-mapping, or a library quirk had to be worked around, that knowledge **must be immediately encoded into .agents/skills/** so future agent invocations and team members never repeat the mistake.

---

## 2. When to Trigger Automatic Skill Updates

The agent **MUST automatically update or create a skill** without waiting for user instruction when:
1. **A subtle bug or regression is fixed**:
   - Record the exact symptom, root cause, and the permanent fix in the relevant skill's Common Pitfalls & Troubleshooting section.
2. **A new location, tower, or drawing format is onboarded**:
   - Record specific page title formats, table of contents quirks, cabinet naming rules, and regex patterns.
3. **Data format collisions or edge cases are resolved**:
   - Examples: delimiter stripping causing 2.42 vs 24.2 collisions, or cabinet prefix shadowing (MCCB1 vs MCCB13).
4. **Architectural rules are established or refined**:
   - Dual schematic mapping rules, English-only UI enforcement, 0x404 link integrity standards, or offline local server compatibility.

---

## 3. Autonomous Update Protocol

`mermaid
flowchart TD
    A[1. Bug Resolved / Insight Discovered] --> B{Governing Skill Exists?}
    B -- Yes --> C[Append Pitfall / Rule to Existing SKILL.md]
    B -- No --> D[Create New Specialized SKILL.md under .agents/skills/]
    C --> E[Update .agents/AGENTS.md if high-level project rule]
    D --> E
    E --> F[Commit Skill along with Code Changes]
`

### Step-by-Step Execution:
1. **Identify the Target**:
   - Drawing mapping, PDF parsing, or schematic classification -> .agents/skills/inteqc_drawing_page_mapping/SKILL.md
   - Engineering workflow, Git branching, or deployment -> .agents/skills/developer-workflow/SKILL.md or GIT_TEAM_WORKFLOW.md
   - Entirely new domain -> Create .agents/skills/<domain-name>/SKILL.md
2. **Format the Learning**:
   Every recorded pitfall or lesson must contain:
   - **Symptom**: Clear observable behavior in the UI or data.
   - **Root Cause**: The technical mechanism of failure (exact regex, sorting error, or logic flaw).
   - **Permanent Fix**: Exact code pattern or architectural guideline.
3. **Commit with Task**:
   - Include the updated/created SKILL.md in the same git commit as the code changes so documentation and code stay in lockstep.

---

## 4. Quality Checklist for Auto-Generated Skills
- [ ] Uses valid YAML frontmatter (
ame and description).
- [ ] Formatted with clean GitHub Flavored Markdown and code snippets.
- [ ] Contains actionable heuristics, not vague generalities.
- [ ] Follows project core rules: English-only UI, 0x404 guarantee, explicit confirmation for git push.
