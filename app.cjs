'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.chdir(__dirname);

(async () => {
  const prodServerPath = path.join(
    __dirname,
    'node_modules',
    'vinext',
    'dist',
    'server',
    'prod-server.js',
  );

  const { startProdServer } = await import(pathToFileURL(prodServerPath).href);
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';

  await startProdServer({
    port,
    host,
    outDir: path.join(__dirname, 'dist'),
  });
})().catch((error) => {
  console.error('[chakod-cpanel] startup failed', error);
  process.exitCode = 1;
});
