# Legal Data Specification: "Tengo Derechos"

This specification outlines the process for collecting, cleaning, parsing, embedding, and loading Mexican legal documents into the database for high-accuracy Retrieval-Augmented Generation (RAG).

---

## 1. Data Sourcing

### A. Federal Level (Mexico)
* **Source**: *Cámara de Diputados del H. Congreso de la Unión* (official portal: [diputados.gob.mx](https://www.diputados.gob.mx/LeyesBiblio/index.htm)).
* **Core Documents**:
  1. *Constitución Política de los Estados Unidos Mexicanos (CPEUM)*
  2. *Código Civil Federal (CCF)*
  3. *Código Penal Federal (CPF)*
  4. *Código Nacional de Procedimientos Penales (CNPP)*
  5. *Ley Federal del Trabajo (LFT)*
  6. *Ley Federal de Protección al Consumidor (LFPC)*

### B. State Level (Ciudad de México - CDMX)
* **Source**: *Congreso de la Ciudad de México* (official portal: [congresocdmx.gob.mx](https://www.congresocdmx.gob.mx/)) and the *Gaceta Oficial de la Ciudad de México*.
* **Core Documents**:
  1. *Código Civil para el Distrito Federal (CDMX)*
  2. *Código Penal para el Distrito Federal (CDMX)*
  3. *Reglamento de Tránsito de la Ciudad de México*

---

## 2. Parsing & Chunking Strategy

Legal documents have a highly hierarchical structure:
`Título (Title) -> Capítulo (Chapter) -> Sección (Section) -> Artículo (Article) -> Párrafo/Fracción (Paragraph/Fraction)`.

### Unit of Retrieval: The Article
For legal QA, retrieving the entire **Artículo** is the standard. Chunking in the middle of an article often strips critical legal context (e.g., exceptions, fines, or definitions found in subsequent paragraphs of the same article).

* **Rule**: Each record in `legal_documents` must represent exactly **one article**.
* **Exception**: If an article exceeds 4,000 characters, it may be split into sub-sections, but each sub-section must repeat the full article context header (e.g., `"Artículo 16 (Párrafo 1-3)"`).

### Output Schema format (JSON)
The parsing script will output a clean JSON array representing parsed articles:
```json
[
  {
    "jurisdiction": "CDMX",
    "code_name": "Reglamento de Tránsito",
    "article_number": "Artículo 34",
    "section_title": "De la circulación de vehículos",
    "content": "Artículo 34. En la vía pública está prohibido: I. Colocar boyas, topes, cadenas, plumas o rejas... [full article text]"
  }
]
```

---

## 3. Embedding Generation

To ensure that semantic search matches conversational user queries (e.g., *"Can a cop stop me without a warrant?"*) with technical legal text (e.g., *Art. 16 Constitución: "Nadie puede ser molestado en su persona..."*), we enrich the text before generating embeddings.

### Text Prefixing Pattern
We construct the input text to the embedding model using the following format:
```
Jurisdicción: [JURISDICTION] | Ordenamiento: [CODE_NAME] | Artículo: [ARTICLE_NUMBER] | Sección: [SECTION_TITLE] | Contenido: [CONTENT]
```

### Embedding Model Configuration
* **Model**: OpenAI `text-embedding-3-small` (or Gemini `text-embedding-004`).
* **Vector Dimension**: 1536 (OpenAI) or 768 (Gemini).
* **Distance Metric**: Cosine Distance (`<=>` in Postgres pgvector).

---

## 4. Supabase Vector Search Function

To execute the vector query from our search Edge Function, we will create the following Postgres function inside Supabase:

```sql
CREATE OR REPLACE FUNCTION match_legal_documents (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_jurisdictions TEXT[]
)
RETURNS TABLE (
  id BIGINT,
  jurisdiction TEXT,
  code_name TEXT,
  article_number TEXT,
  section_title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ld.id,
    ld.jurisdiction,
    ld.code_name,
    ld.article_number,
    ld.section_title,
    ld.content,
    1 - (ld.embedding <=> query_embedding) AS similarity
  FROM public.legal_documents ld
  WHERE 
    ld.jurisdiction = ANY(filter_jurisdictions)
    AND 1 - (ld.embedding <=> query_embedding) > match_threshold
  ORDER BY ld.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 5. Scaling to Other Countries
To expand the app beyond Mexico (e.g., to Colombia, Argentina, or USA):
1. **Jurisdiction Nomenclature**: Use ISO 3166-2 country-state subdivisions for the `jurisdiction` field. E.g., `MX-CDMX` (Mexico City), `MX-FED` (Mexico Federal), `CO-DC` (Bogotá, Colombia), `US-CA` (California, USA).
2. **Dynamic Jurisdiction Filtering**: Pass the user's current country-state subdivision in the query payload to restrict search to the active country's database.
