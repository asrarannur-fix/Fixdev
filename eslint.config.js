import ts from '@typescript-eslint/eslint-plugin'
import tsp from '@typescript-eslint/parser'
import hooks from 'eslint-plugin-react-hooks'
import refresh from 'eslint-plugin-react-refresh'

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsp,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': ts,
      'react-hooks': hooks,
      'react-refresh': refresh,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': 'off',
      'no-var': 'warn',
      'prefer-const': 'warn',
      'prefer-reflect': 'off',
    },
    ignores: ['dist/**', 'node_modules/**', '*.config.ts', '*.config.cjs'],
  },
]