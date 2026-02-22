import type ts from 'typescript';

/**
 * Compute the minimal TextChangeRange between two strings.
 * Used by incremental snapshots so TypeScript can do incremental re-parsing
 * instead of full re-parse.
 */
export function computeChangeRange(oldText: string, newText: string): ts.TextChangeRange {
  const minLen = Math.min(oldText.length, newText.length);

  // Find the first character that differs
  let prefixLen = 0;
  while (prefixLen < minLen && oldText.charCodeAt(prefixLen) === newText.charCodeAt(prefixLen)) {
    prefixLen++;
  }

  // Find the last character that differs (scanning from end)
  let oldSuffix = 0;
  let newSuffix = 0;
  while (
    oldSuffix < oldText.length - prefixLen &&
    newSuffix < newText.length - prefixLen &&
    oldText.charCodeAt(oldText.length - 1 - oldSuffix) === newText.charCodeAt(newText.length - 1 - newSuffix)
  ) {
    oldSuffix++;
    newSuffix++;
  }

  const changeSpanEnd = oldText.length - oldSuffix;
  const changeStart = prefixLen;

  return {
    span: { start: changeStart, length: changeSpanEnd - changeStart },
    newLength: newText.length - prefixLen - newSuffix
  };
}
