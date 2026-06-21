# Tengo Derechos: Legal Data Parser & Ingestion Engine

This module contains utility scripts to extract, structure, embed, and upload Mexican legal codes (PDFs or raw text) to the Supabase database.

---

## 🛠️ Setup

1. Navigate to the parser folder:
   ```bash
   cd parser
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environment variables by creating a `.env` file in this directory:
   ```env
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   OPENAI_API_KEY=your-openai-api-key
   ```
   *(Note: The `SUPABASE_SERVICE_ROLE_KEY` is required because the database requires bypassing RLS policies to write to `legal_documents`.)*

---

## 📂 Processing Pipeline

1. **Source Documents**: Drop PDF files of official codes (e.g. *Código Civil Federal*) in a `sources/` subdirectory.
2. **Parsing**: Runs a regex-based or layout-aware extraction function targeting article indicators (`Artículo X`, `Art. X`).
3. **Embedding**: Sends article chunks to the selected embedding API.
4. **Ingestion**: Inserts resulting articles and vector floats into the PostgreSQL `legal_documents` table.

Run the parser using:
```bash
npm run parse
```
