import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

// Initialize Supabase Client with service role key to bypass RLS policies
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to call OpenAI Embeddings API
async function getEmbedding(text) {
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ Warning: OPENAI_API_KEY is not defined. Generating mock 1536-dim vector for testing.');
    return Array(1536).fill(0).map(() => Math.random() - 0.5);
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: 'text-embedding-3-small'
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('❌ OpenAI Embedding API error:', error.response?.data || error.message);
    throw error;
  }
}

// Main Ingestion Function
async function ingestFile(filePath, jurisdiction, codeName) {
  console.log(`\n📂 Starting ingestion for: ${codeName} (${jurisdiction})`);
  console.log(`📄 Reading: ${filePath}`);

  const rawText = fs.readFileSync(filePath, 'utf-8');

  // Split text by "Artículo" boundary (looks ahead for "Artículo [number]")
  // Matches "Artículo 34", "Artículo 15 Bis", etc.
  const articleRegex = /(?=Artículo\s+\d+)/g;
  const chunks = rawText.split(articleRegex);

  const headerText = chunks[0].trim();
  console.log(`📝 Document Header Snippet: "${headerText.substring(0, 100)}..."`);

  // Remove the header (index 0) and filter out any empty chunks
  const articleChunks = chunks.slice(1).map(c => c.trim()).filter(Boolean);

  console.log(`🔍 Found ${articleChunks.length} articles to process.`);

  for (let i = 0; i < articleChunks.length; i++) {
    const chunk = articleChunks[i];

    // Extract Article Number (e.g. "Artículo 34" or "Artículo 50.-")
    const match = chunk.match(/^Artículo\s+(\d+(?:\s+Bis|Secundus|Ter)?[.-]*)/i);
    const rawArticleNum = match ? match[0] : `Artículo ${i + 1}`;
    // Clean up trailing dashes/periods
    const cleanArticleNum = rawArticleNum.replace(/[.-]/g, '').trim();

    // Prepare text to embed (RAG-enriched format)
    const textToEmbed = `Jurisdicción: ${jurisdiction} | Ordenamiento: ${codeName} | Artículo: ${cleanArticleNum} | Contenido: ${chunk}`;

    console.log(`🚀 Processing [${i + 1}/${articleChunks.length}] - ${cleanArticleNum}...`);

    try {
      // 1. Generate Vector Embedding
      const embedding = await getEmbedding(textToEmbed);

      // 2. Upload to Supabase
      const { error } = await supabase
        .from('legal_documents')
        .insert({
          jurisdiction: jurisdiction,
          code_name: codeName,
          article_number: cleanArticleNum,
          content: chunk,
          embedding: embedding
        });

      if (error) {
        console.error(`❌ DB error inserting ${cleanArticleNum}:`, error.message);
      } else {
        console.log(`✅ Successfully loaded ${cleanArticleNum}`);
      }
    } catch (err) {
      console.error(`❌ Failed to process ${cleanArticleNum}:`, err.message);
    }
  }
}

// Automatically load files in the sources directory
async function run() {
  const sourcesDir = path.join(__dirname, 'sources');

  if (!fs.existsSync(sourcesDir)) {
    console.error(`❌ Sources directory not found at: ${sourcesDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(sourcesDir);
  const textFiles = files.filter(f => f.endsWith('.txt'));

  if (textFiles.length === 0) {
    console.log('ℹ️ No .txt source files found to parse.');
    return;
  }

  for (const file of textFiles) {
    const filePath = path.join(sourcesDir, file);
    
    // Parse metadata from file name: e.g. "transito_cdmx.txt" -> CDMX, Reglamento de Tránsito
    let jurisdiction = 'CDMX';
    let codeName = 'Reglamento de Tránsito de la CDMX';

    if (file.includes('federal')) {
      jurisdiction = 'Federal';
      codeName = file.replace('_federal.txt', '').replace(/_/g, ' ');
    } else if (file.includes('_')) {
      const parts = file.replace('.txt', '').split('_');
      jurisdiction = parts[parts.length - 1].toUpperCase();
      codeName = parts.slice(0, parts.length - 1).join(' ');
      // Capitalize first letters of codeName
      codeName = codeName.replace(/\b\w/g, c => c.toUpperCase());
    }

    await ingestFile(filePath, jurisdiction, codeName);
  }

  console.log('\n🎉 Legal Data Ingestion process completed.');
}

run();
