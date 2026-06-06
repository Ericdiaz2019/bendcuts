/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // libredwg-web ships a large generated WASM glue module that overflows
  // webpack's parser when bundled. Loading it from node_modules at runtime
  // sidesteps the compile and also keeps the GPL'd binary off the client.
  serverExternalPackages: ['@mlightcad/libredwg-web'],
}

export default nextConfig
