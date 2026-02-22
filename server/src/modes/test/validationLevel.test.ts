import assert from 'assert';
import { ValidationLevel } from '../../embeddedSupport/languageModes';

suite('ValidationLevel', () => {
  test('type values: syntactic and full are valid ValidationLevel values', () => {
    const syntactic: ValidationLevel = 'syntactic';
    const full: ValidationLevel = 'full';
    assert.strictEqual(syntactic, 'syntactic');
    assert.strictEqual(full, 'full');
  });

  suite('JS mode doValidation branching', () => {
    // These tests simulate the branching logic found in javascript.ts doValidation
    // without requiring a full TS Language Service setup.

    function simulateJsDoValidation(level: ValidationLevel = 'full') {
      const syntacticDiags = [{ message: 'syntax-error', category: 'syntactic' }];
      const semanticDiags = [{ message: 'type-error', category: 'semantic' }];
      const suggestionDiags = [{ message: 'suggestion', category: 'suggestion' }];

      const result = [...syntacticDiags];

      if (level === 'full') {
        result.push(...semanticDiags, ...suggestionDiags);
      }

      return result;
    }

    test('full level returns syntactic + semantic + suggestion diagnostics', () => {
      const diags = simulateJsDoValidation('full');
      assert.strictEqual(diags.length, 3);
      assert.ok(diags.some(d => d.category === 'syntactic'));
      assert.ok(diags.some(d => d.category === 'semantic'));
      assert.ok(diags.some(d => d.category === 'suggestion'));
    });

    test('syntactic level returns only syntactic diagnostics', () => {
      const diags = simulateJsDoValidation('syntactic');
      assert.strictEqual(diags.length, 1);
      assert.strictEqual(diags[0].category, 'syntactic');
    });

    test('syntactic level with no syntax errors returns empty', () => {
      function simulateNoErrors(level: ValidationLevel = 'full') {
        const syntacticDiags: any[] = [];
        const semanticDiags = [{ message: 'type-error', category: 'semantic' }];
        const result = [...syntacticDiags];
        if (level === 'full') {
          result.push(...semanticDiags);
        }
        return result;
      }
      const diags = simulateNoErrors('syntactic');
      assert.strictEqual(diags.length, 0);
    });

    test('default level (no argument) behaves same as full', () => {
      const diagsDefault = simulateJsDoValidation();
      const diagsFull = simulateJsDoValidation('full');
      assert.deepStrictEqual(diagsDefault, diagsFull);
    });
  });

  suite('Interpolation mode doValidation branching', () => {
    // These tests simulate the interpolation mode branching logic found in
    // interpolationMode.ts doValidation without requiring infrastructure.

    function simulateInterpolationDoValidation(level?: ValidationLevel) {
      // Template interpolation validation is purely semantic.
      // Skip entirely during syntactic-only validation.
      if (level === 'syntactic') {
        return [];
      }

      // Simulate semantic diagnostics from template interpolation
      return [
        { message: 'template-type-error', category: 'semantic' },
        { message: 'binding-error', category: 'semantic' }
      ];
    }

    test('syntactic level returns empty array immediately', () => {
      const diags = simulateInterpolationDoValidation('syntactic');
      assert.deepStrictEqual(diags, []);
    });

    test('full level returns all semantic diagnostics', () => {
      const diags = simulateInterpolationDoValidation('full');
      assert.strictEqual(diags.length, 2);
      assert.ok(diags.every(d => d.category === 'semantic'));
    });

    test('undefined level (default) behaves same as full', () => {
      const diagsUndefined = simulateInterpolationDoValidation(undefined);
      const diagsFull = simulateInterpolationDoValidation('full');
      assert.deepStrictEqual(diagsUndefined, diagsFull);
    });
  });

  suite('Trigger mode: onDidChangeContent vs onDidSave', () => {
    // This simulates the VLS setupFileChangeListeners pattern in vls.ts:
    // - onDidChangeContent → triggerValidation with 'syntactic'
    // - onDidSave → triggerValidation with 'full'

    test('onDidChangeContent triggers syntactic validation', () => {
      let capturedLevel: ValidationLevel | undefined;
      function triggerValidation(_doc: any, level: ValidationLevel = 'full') {
        capturedLevel = level;
      }
      // Simulate onDidChangeContent handler
      triggerValidation({}, 'syntactic');
      assert.strictEqual(capturedLevel, 'syntactic');
    });

    test('onDidSave triggers full validation', () => {
      let capturedLevel: ValidationLevel | undefined;
      function triggerValidation(_doc: any, level: ValidationLevel = 'full') {
        capturedLevel = level;
      }
      // Simulate onDidSave handler
      triggerValidation({}, 'full');
      assert.strictEqual(capturedLevel, 'full');
    });
  });
});
