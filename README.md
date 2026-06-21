# Tengo Derechos (I Have Rights)

**Tengo Derechos** is a cross-platform mobile application (Android & iOS) designed to empower individuals in Mexico by providing easy, immediate, and AI-powered access to their constitutional and civil rights. 

The application allows users to query legal topics in natural language (e.g., *"What are my parenting obligations?"* or *"If another car hits me from behind, what are my rights?"*), view state-specific or federal codes, and securely upload multimedia evidence (photos or videos) to ask if a witnessed event is legal.

---

## 🚀 Key Features

* **Google-Style Legal Search**: A clean search bar with popular queries displayed immediately below it. No login is required for quick queries.
* **AI-Powered Legal Assistant**: Delivers plain-language explanations of rights accompanied by official code citations (articles from the Constitution, Civil Code, Penal Code, etc.).
* **State & Federal Resolution**: Location-aware parsing that detects which of Mexico's 32 states the user is in to filter state-specific laws (defaulting to Federal and Ciudad de México codes in v1).
* **Multimedia Reports**: Capture or upload photos/videos (e.g., traffic stops, incidents) and query their legality. Permissions are requested dynamically, and all files undergo privacy filtering (metadata stripping/blurring) before server storage.
* **Secure Document Archiving**: Authenticated users can save their queries, media uploads, and legal case briefs.

---

## 🛠️ Tech Stack

* **Frontend**: React Native, Expo, TypeScript, React Navigation.
* **Backend**: Supabase (Auth, PostgreSQL with `pgvector` for semantic search, Storage for files, Edge Functions for AI RAG pipeline).
* **AI Engine**: Model-agnostic integration (compatible with Gemini, Claude, and GPT).

---

## 📂 Repository Structure

This repository uses **Spec-Driven Development (SDD)**. Core specifications are located in the `specs/` directory and act as the single source of truth for implementation.

```
├── README.md                # Project overview and setup
├── Agents.md                # Guidelines for AI agent roles & conventions
├── specs/                   # System and product specifications
│   ├── product_spec.md      # Product Requirements Document (PRD) & UI/UX flow
│   ├── architecture_spec.md # System architecture and data flow
│   ├── database_spec.md     # SQL schema definitions, RLS, and storage
│   └── legal_data_spec.md   # Scraping, parsing, and embedding Mexican codes
```

---

## 🤖 Guidelines for AI Agents

If you are an AI assistant working on this project:
1. Adopt a role defined in [Agents.md](file:///Users/marcosal/tengoderechos/Agents.md).
2. Never write code without checking if the specifications in `specs/` need updating first.
3. Keep the documentation consistent and up-to-date.
