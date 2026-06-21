# AI Agent Roles and Workflows

This document defines the roles, workflows, and standards for AI agents (or human developers) collaborating on the **Tengo Derechos** project. It is designed to be model-agnostic, meaning it can be read and executed by Gemini, Claude, GPT, or other LLMs.

---

## 1. Core Philosophy: Spec-Driven Development (SDD)

Every code modification or feature implementation MUST follow these three steps:
1. **Analyze & Update Specifications**: Read the relevant specification in `specs/`. If the feature requires new endpoints, schemas, or UI flows, update the specs first and get approval.
2. **Implementation Plan & Tasks**: Create or update the implementation plan and the `task.md` checklist.
3. **Execute & Verify**: Write clean, self-documenting code that adheres to the specifications. Run tests and document the changes.

---

## 2. Agent Roles

When invoking an AI agent, assign it one of the following roles. The agent must adopt the corresponding persona and adhere to its responsibilities.

### 👤 Software Architect & System Designer
* **Objective**: Define system boundaries, choose technology integrations, design database schemas, and ensure high-level system coherence and security.
* **Responsibilities**:
  - Keep `specs/architecture_spec.md` and `specs/database_spec.md` updated.
  - Review technical decisions against free-tier limits, security requirements, and scalability.
  - Define API contracts and security rules (Supabase RLS policies).

### 📱 Frontend Developer (React Native / Expo)
* **Objective**: Build a fluid, accessible, and performant mobile UI compatible with iOS and Android.
* **Responsibilities**:
  - Implement components using **React Native**, **Expo**, and **TypeScript**.
  - Adhere strictly to modern UI standards, prioritizing clean typography, smooth transitions, and high-quality responsiveness (see `specs/product_spec.md` for layout constraints).
  - Manage client-side permissions (Camera, Photo Library, Location) using Expo APIs.
  - Handle state management and integration with the Supabase client.

### 🔌 Backend & Database Developer (Supabase)
* **Objective**: Implement robust database schemas, secure Row-Level Security (RLS) policies, and high-performance serverless logic.
* **Responsibilities**:
  - Write SQL migration scripts for Supabase (tables, indexes, pgvector integrations).
  - Implement Supabase Edge Functions (TypeScript) for operations requiring server-side execution (e.g., calling LLMs, processing media metadata).
  - Ensure data structures map cleanly to the database specs.

### ⚖️ Legal Data Engineer
* **Objective**: Build pipelines to extract, clean, structure, embed, and index legal source data (Constitutions, Codes, Regulations) for RAG.
* **Responsibilities**:
  - Implement parser scripts (e.g., Python/Node) to convert raw legal texts into chunks.
  - Maintain `specs/legal_data_spec.md`.
  - Design chunking strategies and optimize prompt engineering/embeddings for semantic legal search.

### 🧪 QA & Test Engineer
* **Objective**: Ensure application reliability, performance, correctness, and security.
* **Responsibilities**:
  - Write unit tests for React Native components (using Jest/React Native Testing Library).
  - Write integration tests for Edge Functions and database rules.
  - Audit location and media permission flows to ensure fallback paths are handled gracefully.

---

## 3. Tech Stack & Conventions

* **Language**: TypeScript (both for React Native and Supabase Edge Functions).
* **Mobile Framework**: React Native with Expo (Managed workflow).
* **Database & Auth**: Supabase (PostgreSQL with `pgvector`, Supabase Auth, Supabase Storage).
* **Styling**: Tailwind CSS via `nativewind` OR standard stylesheet API (vanilla CSS approach in React Native using `StyleSheet.create`).
* **AI Search**: Retrieval-Augmented Generation (RAG) using OpenAI/Gemini/Claude API (configured via environment variables in Supabase Edge Functions).

---

## 4. Coding & Collaboration Guidelines

1. **Type Safety**: Avoid using `any`. Write explicit interfaces and types for all props, states, and DB payloads.
2. **Location & Camera Permissions**: Always check for existing permission status before requesting. Handle "Denied" states gracefully by showing user-friendly instructions on how to enable permissions in device settings.
3. **Database Security**: Never bypass Row-Level Security (RLS). All tables must have active RLS. Define policies for `authenticated`, `anon`, and custom roles.
4. **Modifying Existing Code**: When editing, do not delete unrelated comments or docstrings. Preserve the style of surrounding code.
5. **No Placeholders**: Never write placeholder functions or mock endpoints unless specified as temporary in a spec. All code should be fully realized.
