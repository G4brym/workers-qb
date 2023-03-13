import bundleSize from 'rollup-plugin-bundle-size'
import { defineConfig } from 'rollup'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'

export default defineConfig({
  input: 'src/workers-qb.ts',
  output: [
    { format: 'cjs', file: 'dist/workers-qb.js' },
    { format: 'es', file: 'dist/workers-qb.mjs' },
  ],
  plugins: [typescript(), terser(), bundleSize()],
})
