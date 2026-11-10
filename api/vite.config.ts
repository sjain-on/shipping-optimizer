import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shipping-combinator/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
