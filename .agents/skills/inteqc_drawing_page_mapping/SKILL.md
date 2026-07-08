---
name: inteqc-drawing-page-mapping
description: >
  How to map inteqc Cabinet Drawing PDF pages to specific control cabinets (Location/Cabinet).
  Use when working with 泰国inteqc Cabinet drawing PDF files to find which PDF page corresponds
  to which equipment or cabinet drawing.
---

# Inteqc Cabinet Drawing — Page Mapping Guide

## Overview

The PDF page number shown in the viewer does NOT match the internal page number (页数) of the drawing.
To find the correct drawing for a specific equipment or cabinet, follow this 2-step process.

## Step 1: Lookup in 目录 (Table of Contents)

The PDF contains 目录 (Table of Contents/Index) pages near the beginning. Each TOC row has 6 columns:

| Column | Name | Description |
|--------|------|-------------|
| 1 | Location | Cabinet/rack ID (e.g., `LCB_6B`, `MCCY1_2`) |
| 2 | Page | Internal page number (e.g., `2503`) |
| 3 | Title(CN) | Chinese title — main identifier for search |
| 4 | Title(EN) | English title |
| 5 | 日期 | Date |
| 6 | 编辑者 | Editor |

**Key columns**: Focus on **Location**, **Page**, and **Title(CN)**.

### Example
To find drawing for `V6.4_2`:
1. Search Title(CN) column for a matching name → found
2. Read Page column → `2503`
3. Read Location column → `LCB_6B`

## Step 2: Verify on the Actual PDF Page

Navigate to the page whose bottom-right corner shows the matching internal page number.

The drawing page frame has a structured info block in the **bottom-right corner**:

| Position | Content |
|----------|---------|
| Column 7, Row 1 | **Location** (cabinet/rack ID, e.g., `LCB_6B`) |
| Column 4 | **Title(CN)** — matches the TOC entry |
| Column 7, Row 3 | Label: `页数` (page number) |
| Column 7, Row 4 (below 页数) | **Internal page number** (e.g., `2503`) |

### Verification Checklist
- [ ] Internal page number (页数) matches Page from TOC
- [ ] Title(CN) on the page matches Title(CN) from TOC
- [ ] Location on the page matches Location from TOC
