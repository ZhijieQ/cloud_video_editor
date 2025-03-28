/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push({
      sharp: "commonjs sharp",
      canvas: "commonjs canvas",
    });
    return config;
  },
<<<<<<< HEAD
=======
  images: {
    domains: ['images.unsplash.com'],
  },
>>>>>>> 279f1acc32f96a40010c14d81d3dc8c742becb77
};

module.exports = nextConfig;
