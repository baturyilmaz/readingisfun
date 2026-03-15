import js from '@eslint/js'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ['src/**/*.{ts,tsx}'],
  plugins: {
    react: reactPlugin,
    'react-hooks': reactHooks,
  },
  languageOptions: {
    globals: globals.browser,
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
    'react/no-multi-comp': ['error', { ignoreStateless: false }],
  },
})
