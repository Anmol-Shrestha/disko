import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  // The acceptance test and its fixture target modules that don't exist until Phases 1–3; lint them then.
  { ignores: ['out/**', 'dist/**', 'node_modules/**', 'scripts/**', 'tests/acceptance/**', 'tests/fixtures/**'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((c) => ({ ...c, files: ['**/*.{ts,tsx}'] })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.web.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  prettier,
)
