import assert from 'assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLanguageModelCache } from '../languageModelCache';

function createDoc(uri: string, version: number, languageId = 'vue'): TextDocument {
  return TextDocument.create(uri, languageId, version, '');
}

suite('LanguageModelCache', () => {
  test('same uri and version does not re-parse', () => {
    let parseCount = 0;
    const cache = getLanguageModelCache<number>(10, 0, () => {
      return ++parseCount;
    });

    const doc = createDoc('file:///a.vue', 1);
    const first = cache.refreshAndGet(doc);
    const second = cache.refreshAndGet(doc);
    assert.strictEqual(first, second);
    assert.strictEqual(parseCount, 1);
    cache.dispose();
  });

  test('version change triggers re-parse', () => {
    let parseCount = 0;
    const cache = getLanguageModelCache<number>(10, 0, () => {
      return ++parseCount;
    });

    const doc1 = createDoc('file:///a.vue', 1);
    const doc2 = createDoc('file:///a.vue', 2);
    cache.refreshAndGet(doc1);
    cache.refreshAndGet(doc2);
    assert.strictEqual(parseCount, 2);
    cache.dispose();
  });

  test('languageId change triggers re-parse', () => {
    let parseCount = 0;
    const cache = getLanguageModelCache<number>(10, 0, () => {
      return ++parseCount;
    });

    const doc1 = createDoc('file:///a.vue', 1, 'javascript');
    const doc2 = createDoc('file:///a.vue', 1, 'typescript');
    cache.refreshAndGet(doc1);
    cache.refreshAndGet(doc2);
    assert.strictEqual(parseCount, 2);
    cache.dispose();
  });

  test('maxEntries=3 evicts oldest on third insert', () => {
    let parseCount = 0;
    const cache = getLanguageModelCache<number>(3, 0, () => {
      return ++parseCount;
    });

    const docA = createDoc('file:///a.vue', 1);
    const docB = createDoc('file:///b.vue', 1);
    const docC = createDoc('file:///c.vue', 1);

    cache.refreshAndGet(docA);
    cache.refreshAndGet(docB);
    // At this point nModels=2, inserting docC makes nModels=3 which triggers eviction
    cache.refreshAndGet(docC);
    assert.strictEqual(parseCount, 3);

    // docA was the oldest, so it should have been evicted - accessing it re-parses
    const countBefore = parseCount;
    cache.refreshAndGet(docA);
    assert.strictEqual(parseCount, countBefore + 1, 'docA should have been evicted and re-parsed');

    // Inserting docA back triggered another eviction (nModels hit 3 again),
    // this time docB was the oldest, so docB is also evicted.
    // docC should still be cached.
    const countBefore2 = parseCount;
    cache.refreshAndGet(docC);
    assert.strictEqual(parseCount, countBefore2, 'docC should still be cached');

    cache.dispose();
  });

  test('maxEntries=50 holds 49 documents in cache', () => {
    let parseCount = 0;
    const cache = getLanguageModelCache<number>(50, 0, () => {
      return ++parseCount;
    });

    const docs: TextDocument[] = [];
    for (let i = 0; i < 49; i++) {
      docs.push(createDoc(`file:///file${i}.vue`, 1));
    }

    // First pass: parse all 49
    docs.forEach(doc => cache.refreshAndGet(doc));
    assert.strictEqual(parseCount, 49);

    // Second pass: all 49 should be cached
    docs.forEach(doc => cache.refreshAndGet(doc));
    assert.strictEqual(parseCount, 49, 'all 49 docs should be cached without re-parse');

    cache.dispose();
  });

  test('maxEntries=10 evicts on tenth insert', () => {
    let parseCount = 0;
    const cache = getLanguageModelCache<number>(10, 0, () => {
      return ++parseCount;
    });

    const docs: TextDocument[] = [];
    for (let i = 0; i < 10; i++) {
      docs.push(createDoc(`file:///file${i}.vue`, 1));
    }

    docs.forEach(doc => cache.refreshAndGet(doc));
    assert.strictEqual(parseCount, 10);

    // The first doc (file0) should have been evicted when file9 was inserted
    const countBefore = parseCount;
    cache.refreshAndGet(docs[0]);
    assert.strictEqual(parseCount, countBefore + 1, 'first doc should have been evicted');

    cache.dispose();
  });

  test('onDocumentRemoved causes re-parse on next access', () => {
    let parseCount = 0;
    const cache = getLanguageModelCache<number>(10, 0, () => {
      return ++parseCount;
    });

    const doc = createDoc('file:///a.vue', 1);
    cache.refreshAndGet(doc);
    assert.strictEqual(parseCount, 1);

    cache.onDocumentRemoved(doc);

    // After removal, accessing the same doc/version should trigger re-parse
    cache.refreshAndGet(doc);
    assert.strictEqual(parseCount, 2);

    cache.dispose();
  });

  test('cleanup timer removes expired entries', function (done) {
    this.timeout(5000);
    let parseCount = 0;
    // Use a 1-second cleanup interval
    const cache = getLanguageModelCache<number>(10, 1, () => {
      return ++parseCount;
    });

    const doc = createDoc('file:///a.vue', 1);
    cache.refreshAndGet(doc);
    assert.strictEqual(parseCount, 1);

    // After >1s the cleanup timer should have removed the entry
    setTimeout(() => {
      cache.refreshAndGet(doc);
      assert.strictEqual(parseCount, 2, 'entry should have been cleaned up and re-parsed');
      cache.dispose();
      done();
    }, 2500);
  });
});
