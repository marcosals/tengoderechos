import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMetadataFromFilename } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We isolate the core parsing and cleaning logic to test it directly
function splitArticles(rawText) {
  const articleRegex = /(?=Artículo\s+\d+)/g;
  const chunks = rawText.split(articleRegex);
  return chunks.slice(1).map(c => c.trim()).filter(Boolean);
}

function cleanArticleNumber(chunk, index) {
  const match = chunk.match(/^Artículo\s+(\d+(?:\s+Bis|Secundus|Ter)?[.-]*)/i);
  const rawArticleNum = match ? match[0] : `Artículo ${index + 1}`;
  return rawArticleNum.replace(/[.-]/g, '').trim();
}

function formatEnrichedText(jurisdiction, codeName, articleNum, content) {
  return `Jurisdicción: ${jurisdiction} | Ordenamiento: ${codeName} | Artículo: ${articleNum} | Contenido: ${content}`;
}

test('Legal Ingestion Parser Unit Tests', async (t) => {
  
  await t.test('splitArticles() should correctly split raw text by Article boundaries', () => {
    const rawDocumentText = `REGLAMENTO TEST
Artículo 1.- Primer artículo de prueba con texto.
Artículo 2.- Segundo artículo con detalles.
Artículo 15 Bis.- Un artículo intermedio "Bis" especial.
`;
    const articles = splitArticles(rawDocumentText);
    
    assert.strictEqual(articles.length, 3, 'Should extract exactly 3 articles.');
    assert.ok(articles[0].startsWith('Artículo 1'), 'First article should start with Artículo 1.');
    assert.ok(articles[2].includes('15 Bis'), 'Third article should represent 15 Bis.');
  });

  await t.test('cleanArticleNumber() should clean dots and dashes from headers', () => {
    const chunk1 = 'Artículo 34.- En la vía pública...';
    const chunk2 = 'Artículo 50. En caso de siniestro...';
    const chunk3 = 'Artículo 15 Bis.- Subdisposición...';

    assert.strictEqual(cleanArticleNumber(chunk1, 0), 'Artículo 34', 'Should clean trailing dot and dash.');
    assert.strictEqual(cleanArticleNumber(chunk2, 1), 'Artículo 50', 'Should clean trailing dot.');
    assert.strictEqual(cleanArticleNumber(chunk3, 2), 'Artículo 15 Bis', 'Should clean Bis suffix correctly.');
  });

  await t.test('formatEnrichedText() should format text correctly for vector embeddings', () => {
    const formatted = formatEnrichedText('CDMX', 'Reglamento de Tránsito', 'Artículo 34', 'Contenido del artículo');
    const expected = 'Jurisdicción: CDMX | Ordenamiento: Reglamento de Tránsito | Artículo: Artículo 34 | Contenido: Contenido del artículo';
    
    assert.strictEqual(formatted, expected, 'Formatted RAG string matches expected output.');
  });

  await t.test('getMetadataFromFilename() should resolve names and jurisdictions correctly', () => {
    const cases = [
      { file: 'constitucion_federal.txt', expectedJ: 'Federal', expectedN: 'Constitución Política de los Estados Unidos Mexicanos' },
      { file: 'codigo_civil_federal.txt', expectedJ: 'Federal', expectedN: 'Código Civil Federal' },
      { file: 'ley_federal_trabajo.txt', expectedJ: 'Federal', expectedN: 'Ley Federal del Trabajo' },
      { file: 'transito_cdmx.txt', expectedJ: 'CDMX', expectedN: 'Reglamento de Tránsito de la CDMX' },
      { file: 'reglamento_jalisco.txt', expectedJ: 'JALISCO', expectedN: 'Reglamento' }
    ];

    for (const c of cases) {
      const res = getMetadataFromFilename(c.file);
      assert.strictEqual(res.jurisdiction, c.expectedJ, `Jurisdiction for ${c.file} should match.`);
      assert.strictEqual(res.codeName, c.expectedN, `Code name for ${c.file} should match.`);
    }
  });

  await t.test('Verify split boundaries on actual source documents', () => {
    const sourcesDir = path.join(__dirname, 'sources');
    
    // 1. Constitutional
    const constPath = path.join(sourcesDir, 'constitucion_federal.txt');
    const constText = fs.readFileSync(constPath, 'utf-8');
    const constArticles = splitArticles(constText);
    assert.strictEqual(constArticles.length, 3, 'constitucion_federal.txt should have exactly 3 articles (1, 14, 16).');
    assert.ok(cleanArticleNumber(constArticles[0], 0).includes('Artículo 1'), 'First article is Art 1.');
    assert.ok(cleanArticleNumber(constArticles[1], 1).includes('Artículo 14'), 'Second article is Art 14.');
    assert.ok(cleanArticleNumber(constArticles[2], 2).includes('Artículo 16'), 'Third article is Art 16.');

    // 2. Civil Code
    const civilPath = path.join(sourcesDir, 'codigo_civil_federal.txt');
    const civilText = fs.readFileSync(civilPath, 'utf-8');
    const civilArticles = splitArticles(civilText);
    assert.strictEqual(civilArticles.length, 4, 'codigo_civil_federal.txt should have exactly 4 articles (303, 304, 308, 311).');

    // 3. Labor Law
    const laborPath = path.join(sourcesDir, 'ley_federal_trabajo.txt');
    const laborText = fs.readFileSync(laborPath, 'utf-8');
    const laborArticles = splitArticles(laborText);
    assert.strictEqual(laborArticles.length, 3, 'ley_federal_trabajo.txt should have exactly 3 articles (47, 48, 50).');
  });
});
