import { AppType } from "./analytics";

export interface ScratchpadItem {
  id: string;
  title: string;
  content: string;
  targetAgent?: AppType;
  targetWorkspaceId?: string;
  pinned?: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DeletedScratchpadItem extends ScratchpadItem {
  deletedAt: number;
}

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  category: "planning" | "refactor" | "debugging" | "testing" | "agent_spec";
  template: string;
}

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "tmpl_feature_plan",
    title: "Feature Implementation Plan",
    category: "planning",
    description: "Structured roadmap for implementing a new feature with architecture & verification steps",
    template: `# Feature: [Feature Name]

## 1. Goal & Requirements
- Primary Objective: [Explain what we are building]
- User Persona / Use Case: [Who uses this and how]
- Core Requirements:
  - [Requirement 1]
  - [Requirement 2]

## 2. Technical Architecture & Design
- Affected Components / Files:
  - \`path/to/component.tsx\`
  - \`path/to/service.ts\`
- State Management & Data Flow:
  - [Explain how state changes flow through the system]

## 3. Step-by-Step Implementation Steps
1. [Step 1: Setup types and interfaces]
2. [Step 2: Implement core business logic]
3. [Step 3: Build UI components and bind handlers]
4. [Step 4: Polish edge cases and error handling]

## 4. Verification & Testing Plan
- [ ] Unit tests covering edge cases
- [ ] Manual test: [Describe exact user interaction]
- [ ] Build & lint validation: zero regressions
`,
  },
  {
    id: "tmpl_bug_root_cause",
    title: "Bug Root Cause Analysis & Fix",
    category: "debugging",
    description: "Deep-dive debugging prompt with symptom breakdown, reproduction steps, and root cause hypothesis",
    template: `# Bug Investigation: [Issue Summary]

## 1. Symptoms & Observed Behavior
- What happens: [Detailed description of the unexpected behavior]
- Expected behavior: [What should happen instead]
- Error messages / console traces:
\`\`\`
[Paste error log or stack trace here]
\`\`\`

## 2. Reproduction Steps
1. Navigate to [Page / Component]
2. Perform action [Action sequence]
3. Observe [Failure mode]

## 3. Suspected Root Cause & Affected Code
- File: \`path/to/faulty_file.ts\` (Lines ~[X-Y])
- Hypothesis: [Why the bug occurs and what race condition or state mismatch causes it]

## 4. Proposed Fix & Safeguards
- [ ] Correct state lifecycle / async race condition
- [ ] Add defensive fallback checks
- [ ] Verify fix does not introduce side effects
`,
  },
  {
    id: "tmpl_code_refactor",
    title: "Code Refactoring & Clean Code",
    category: "refactor",
    description: "Deconstruct messy code into clean, modular, and maintainable abstractions",
    template: `# Refactoring Specification: [Module / Component Name]

## 1. Motivation & Technical Debt
- Problems with current implementation:
  - [e.g. Duplicated logic / bloated component / brittle state]
- Refactoring Goal:
  - [e.g. Extract reusable hooks, improve readability, modularize CSS]

## 2. Scope of Changes
- Deprecate / Replace:
  - \`oldHelperFunction()\` -> replace with \`useCustomHook()\`
- New Structure:
  - \`src/components/.../NewSubComponent.tsx\`

## 3. Constraints & Invariants
- Zero regression in existing user-facing functionality
- Maintain all existing event contracts and test suites
- Keep performance overhead minimal
`,
  },
  {
    id: "tmpl_agent_system_prompt",
    title: "Agent Mission & Guardrails Spec",
    category: "agent_spec",
    description: "Detailed system instructions, operational constraints, and deliverables for an autonomous AI agent",
    template: `# AGENT DIRECTIVE: [Task Name]

## Mission
You are acting as an expert senior software engineer. Your goal is to [describe mission].

## Context & Architecture
- Workspace Directory: \`{{cwd}}\`
- Active Workspace: \`{{workspace_name}}\`
- Technology Stack: TypeScript, React, Tailwind CSS, Tauri / Rust

## Strict Constraints & Guardrails
1. Do NOT make unnecessary breaking changes to existing APIs.
2. Ensure all types are strictly defined without using \`any\` where possible.
3. Validate all edge cases and ensure zero console errors.
4. Keep functions concise, single-responsibility, and well-documented.

## Expected Deliverables
- [ ] Updated and validated source files
- [ ] Verification report detailing exact test steps
`,
  },
];

export const INITIAL_SCRATCHPAD: ScratchpadItem = {
  id: "pad_welcome",
  title: "Agent Launchpad & Plan Draft",
  content: `# Welcome to Scratchpad Studio 🚀

Use this distraction-free space to draft your largest prompts, architecture RFCs, and complex multi-step execution plans before dispatching them to your AI coding agents.

## Quick Features:
- ✍️ **Auto-Saved Continuously**: Every keystroke is saved periodically into local storage so you never lose your train of thought.
- ⚡ **Direct Agent Dispatch**: Select **Spawn Agent** from the toolbar to send this plan directly to **Antigravity CLI**, **Claude Code**, **Codex**, **Grok**, or any system shell in an existing or new workspace.
- ⏱️ **Agent Readiness Guard**: When dispatched, the terminal waits for the agent CLI to boot up and initialize before safely injecting your prompt.
- 📊 **Word & Token Estimator**: Track estimated token count to optimize prompt size for LLM context windows.
- 📑 **Markdown Live Preview**: Split view or preview mode with formatted code blocks, task lists, and tables.

---

### Scratchpad Draft
Write your prompt or select a template from the top bar to get started!
`,
  targetAgent: "antigravity",
  pinned: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
