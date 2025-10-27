/** @type {import('next').NextConfig} */
const nextConfig = {
  // transpile our workspace package so Next can bundle it
  transpilePackages: ['@aa/queue'],
};

export default nextConfig;
