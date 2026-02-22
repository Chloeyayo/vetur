import assert from 'assert';
import { isDocumentInAffectedProject, filterDocumentsByAffectedProjects } from '../../utils/projectScope';

suite('Project Scope Filtering', () => {
  test('document in affected project returns true', () => {
    const roots = new Set(['/home/user/project1']);
    assert.strictEqual(isDocumentInAffectedProject('/home/user/project1/src/App.vue', roots), true);
  });

  test('document not in any affected project returns false', () => {
    const roots = new Set(['/home/user/project1']);
    assert.strictEqual(isDocumentInAffectedProject('/home/user/project2/src/App.vue', roots), false);
  });

  test('empty roots returns false', () => {
    const roots = new Set<string>();
    assert.strictEqual(isDocumentInAffectedProject('/home/user/project1/src/App.vue', roots), false);
  });

  test('multiple roots matches one', () => {
    const roots = new Set(['/home/user/project1', '/home/user/project2']);
    assert.strictEqual(isDocumentInAffectedProject('/home/user/project2/src/App.vue', roots), true);
  });

  test('path prefix ambiguity: /app1-extra startsWith /app1 is recorded as true', () => {
    // This documents the current startsWith behavior: /app1-extra matches /app1
    // because startsWith does not enforce a path separator boundary.
    const roots = new Set(['/app1']);
    assert.strictEqual(isDocumentInAffectedProject('/app1-extra/src/App.vue', roots), true);
  });

  test('Windows-style paths', () => {
    const roots = new Set(['C:\\Users\\dev\\project1']);
    assert.strictEqual(
      isDocumentInAffectedProject('C:\\Users\\dev\\project1\\src\\App.vue', roots),
      true
    );
  });

  test('batch filter across multiple projects', () => {
    const roots = new Set(['/projects/app1', '/projects/app2']);
    const docs = [
      ...Array.from({ length: 20 }, (_, i) => `/projects/app1/src/file${i}.vue`),
      ...Array.from({ length: 20 }, (_, i) => `/projects/app2/src/file${i}.vue`),
      ...Array.from({ length: 20 }, (_, i) => `/projects/app3/src/file${i}.vue`)
    ];

    const filtered = filterDocumentsByAffectedProjects(docs, roots);
    assert.strictEqual(filtered.length, 40);
    assert.ok(filtered.every(d => d.startsWith('/projects/app1') || d.startsWith('/projects/app2')));
  });

  test('performance: 1000 files x 5 roots < 100ms', () => {
    const roots = new Set([
      '/projects/root1',
      '/projects/root2',
      '/projects/root3',
      '/projects/root4',
      '/projects/root5'
    ]);
    const docs = Array.from({ length: 1000 }, (_, i) => `/projects/root${(i % 6) + 1}/src/file${i}.vue`);

    const start = Date.now();
    filterDocumentsByAffectedProjects(docs, roots);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `Expected < 100ms but took ${elapsed}ms`);
  });
});
