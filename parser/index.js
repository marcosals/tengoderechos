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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const isTestRun = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test') || arg.includes('--test'));

if (!isTestRun && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

// Initialize Supabase Client with service role key to bypass RLS policies
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Helper function to call Gemini Embeddings API
async function getEmbedding(text) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('placeholder')) {
    console.warn('⚠️ Warning: GEMINI_API_KEY is not defined or is a placeholder. Generating mock 768-dim vector for testing.');
    return Array(768).fill(0).map(() => Math.random() - 0.5);
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${GEMINI_API_KEY}`,
      {
        model: 'models/gemini-embedding-2',
        content: {
          parts: [{ text: text }]
        },
        outputDimensionality: 768
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.embedding.values;
  } catch (error) {
    console.error('❌ Gemini Embedding API error:', error.response?.data || error.message);
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

// Helper function to extract metadata from filename
export function getMetadataFromFilename(filename) {
  const name = filename.replace('.txt', '').toLowerCase();
  
  if (name === 'constitucion_federal') {
    return {
      jurisdiction: 'Federal',
      codeName: 'Constitución Política de los Estados Unidos Mexicanos'
    };
  }
  if (name === 'codigo_civil_federal') {
    return {
      jurisdiction: 'Federal',
      codeName: 'Código Civil Federal'
    };
  }
  if (name === 'ley_federal_trabajo') {
    return {
      jurisdiction: 'Federal',
      codeName: 'Ley Federal del Trabajo'
    };
  }
  if (name === 'transito_cdmx') {
    return {
      jurisdiction: 'CDMX',
      codeName: 'Reglamento de Tránsito de la CDMX'
    };
  }
  
  // Generic Fallback
  let jurisdiction = 'CDMX';
  let codeName = filename.replace('.txt', '').replace(/_/g, ' ');
  
  if (filename.includes('_')) {
    const parts = filename.replace('.txt', '').split('_');
    const lastPart = parts[parts.length - 1].toUpperCase();
    if (['CDMX', 'FEDERAL', 'JALISCO', 'NUEVO_LEON', 'EDOMEX'].includes(lastPart)) {
      jurisdiction = lastPart === 'FEDERAL' ? 'Federal' : lastPart;
      codeName = parts.slice(0, parts.length - 1).join(' ');
    } else {
      codeName = parts.join(' ');
    }
  }
  
  // Capitalize words
  codeName = codeName.replace(/\b\w/g, c => c.toUpperCase());
  return { jurisdiction, codeName };
}

// Automatically load files in the sources directory
async function run() {
  const sourcesDir = path.join(__dirname, 'sources');

  if (!fs.existsSync(sourcesDir)) {
    console.error(`❌ Sources directory not found at: ${sourcesDir}`);
    process.exit(1);
  }

  // 0. Clean the table first to prevent duplicates on re-run
  console.log('🧹 Clearing legal_documents table...');
  const { error: deleteError } = await supabase
    .from('legal_documents')
    .delete()
    .gt('id', 0); // deletes all rows

  if (deleteError) {
    console.error('❌ Failed to clear table:', deleteError.message);
  } else {
    console.log('✅ Table cleared.');
  }

  const files = fs.readdirSync(sourcesDir);
  const textFiles = files.filter(f => f.endsWith('.txt'));

  if (textFiles.length === 0) {
    console.log('ℹ️ No .txt source files found to parse.');
    return;
  }

  for (const file of textFiles) {
    const filePath = path.join(sourcesDir, file);
    const { jurisdiction, codeName } = getMetadataFromFilename(file);
    await ingestFile(filePath, jurisdiction, codeName);
  }

  console.log('\n🎉 Legal Data Ingestion process completed.');
}

if (process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('parser/index.js'))) {
  run();
}
