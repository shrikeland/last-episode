import config from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  { ignores: ['.claude/', '.junie/', '.windsurf/', 'src/', '.design-sync/', 'ds-bundle/'] },
  ...config,
  {
    // Playwright fixtures receive a `use` callback that is not a React hook
    files: ['e2e/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
]

export default eslintConfig
