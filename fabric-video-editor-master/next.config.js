/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push({
      sharp: "commonjs sharp",
      canvas: "commonjs canvas",
    });
    return config;
  },

  images: {
    domains: ['images.unsplash.com'],
  },

};

module.exports = nextConfig;
