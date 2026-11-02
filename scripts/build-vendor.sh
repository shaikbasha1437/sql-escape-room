#!/bin/sh
# Rebuild vendor/ (run from a scratch folder with the packages from vendor/VERSIONS.txt installed).
npx esbuild scripts/vendor-entry.js --bundle --format=iife --global-name=CM --minify --legal-comments=none --target=es2019 --outfile=vendor/codemirror.js
cp node_modules/sql.js/dist/sql-wasm.js node_modules/sql.js/dist/sql-wasm.wasm vendor/
