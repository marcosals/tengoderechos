import test from 'node:test';
import assert from 'node:assert';

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
});
