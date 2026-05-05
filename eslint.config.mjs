import config from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  { ignores: ['.claude/', '.junie/', '.windsurf/', 'src/'] },
  ...config,
]

export default eslintConfig