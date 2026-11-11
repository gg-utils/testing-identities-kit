import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '**/*.js', '**/*.mjs', '**/*.test.ts', '**/*.unit.test.ts', '**/*.unit.test.tsx'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  { rules: { '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }] }, languageOptions: { parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname } } },
);
