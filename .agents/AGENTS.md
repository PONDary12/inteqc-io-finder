# Project I/O — Agent Rules

## I/O Project Preferences
- Display equipment names and UI text in **English only** (do not show Chinese text in the user-facing interface).
- Design the system to easily support adding new Towers/Locations in the future (extensible architecture).
- Always ask for explicit user confirmation before executing `git push` to GitHub.

## Team Handover & Onboarding Instructions
When any engineer, developer, or teammate opens this workspace in Antigravity:
- Recognize this project as the **INTEQC I/O & Electrical Schematic Finder** for INTEQC Feed Co., Ltd.
- Proactively guide them using the project documentation:
  - User operations: Refer to `USER_MANUAL.md`.
  - Architecture and adding new Towers/Cabinets: Refer to `HANDOVER_DEVELOPER_GUIDE.md` and the `inteqc-drawing-page-mapping` skill.
  - Multi-person Git branching and conflict resolution: Refer to `GIT_TEAM_WORKFLOW.md`.
- When asked to add a new tower or parse drawings, strictly follow the SOP in `.agents/skills/inteqc_drawing_page_mapping/SKILL.md` (English-only UI, zero 404s, filtering electrical ratings, dual schematic mapping).
- Keep communication helpful, clear, and professional in Thai or English as preferred by the user.

