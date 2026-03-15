import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ['src/**/*.ts'],
  languageOptions: {
    globals: globals.node,
  },
  rules: {
    'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
  },
})
