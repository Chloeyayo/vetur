import assert from 'assert';
import { computeChangeRange } from '../changeRange';

suite('computeChangeRange', () => {
  test('identical text returns zero-length span and newLength', () => {
    const text = 'hello world';
    const result = computeChangeRange(text, text);
    assert.strictEqual(result.span.length, 0);
    assert.strictEqual(result.newLength, 0);
  });

  test('insertion in the middle', () => {
    const oldText = 'helloworld';
    const newText = 'hello world';
    const result = computeChangeRange(oldText, newText);
    assert.strictEqual(result.span.start, 5);
    assert.strictEqual(result.span.length, 0);
    assert.strictEqual(result.newLength, 1);
  });

  test('deletion in the middle', () => {
    const oldText = 'hello world';
    const newText = 'helloworld';
    const result = computeChangeRange(oldText, newText);
    assert.strictEqual(result.span.start, 5);
    assert.strictEqual(result.span.length, 1);
    assert.strictEqual(result.newLength, 0);
  });

  test('replacement in the middle', () => {
    const oldText = 'hello world';
    const newText = 'hello WORLD';
    const result = computeChangeRange(oldText, newText);
    assert.strictEqual(result.span.start, 6);
    assert.strictEqual(result.span.length, 5);
    assert.strictEqual(result.newLength, 5);
  });

  test('insertion at the beginning', () => {
    const oldText = 'world';
    const newText = 'hello world';
    const result = computeChangeRange(oldText, newText);
    assert.strictEqual(result.span.start, 0);
    assert.strictEqual(result.span.length, 0);
    assert.strictEqual(result.newLength, 6);
  });

  test('insertion at the end', () => {
    const oldText = 'hello';
    const newText = 'hello world';
    const result = computeChangeRange(oldText, newText);
    assert.strictEqual(result.span.start, oldText.length);
    assert.strictEqual(result.span.length, 0);
    assert.strictEqual(result.newLength, 6);
  });

  test('clear all content', () => {
    const oldText = 'hello world';
    const newText = '';
    const result = computeChangeRange(oldText, newText);
    assert.strictEqual(result.span.start, 0);
    assert.strictEqual(result.span.length, oldText.length);
    assert.strictEqual(result.newLength, 0);
  });

  test('empty to non-empty', () => {
    const oldText = '';
    const newText = 'hello world';
    const result = computeChangeRange(oldText, newText);
    assert.strictEqual(result.span.start, 0);
    assert.strictEqual(result.span.length, 0);
    assert.strictEqual(result.newLength, newText.length);
  });

  test('single character insertion', () => {
    const oldText = 'ab';
    const newText = 'axb';
    const result = computeChangeRange(oldText, newText);
    assert.strictEqual(result.span.start, 1);
    assert.strictEqual(result.span.length, 0);
    assert.strictEqual(result.newLength, 1);
  });

  test('single character deletion', () => {
    const oldText = 'axb';
    const newText = 'ab';
    const result = computeChangeRange(oldText, newText);
    assert.strictEqual(result.span.start, 1);
    assert.strictEqual(result.span.length, 1);
    assert.strictEqual(result.newLength, 0);
  });

  test('large file with small change completes quickly', () => {
    const base = 'a'.repeat(200 * 1024);
    const oldText = base;
    const newText = base.slice(0, 100000) + 'X' + base.slice(100000);
    const start = Date.now();
    const result = computeChangeRange(oldText, newText);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 500, `Expected < 500ms but took ${elapsed}ms`);
    assert.strictEqual(result.span.start, 100000);
    assert.strictEqual(result.span.length, 0);
    assert.strictEqual(result.newLength, 1);
  });

  test('changes at both beginning and end degrade to full span', () => {
    const oldText = 'ABCDE';
    const newText = 'xBCDy';
    const result = computeChangeRange(oldText, newText);
    // The first character differs (A vs x) and last character differs (E vs y),
    // so the span covers the entire old text.
    assert.strictEqual(result.span.start, 0);
    assert.strictEqual(result.span.length, oldText.length);
    assert.strictEqual(result.newLength, newText.length);
  });
});
