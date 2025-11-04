/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  reactStrictMode: true,
  swcMinify: true,

  // Skip ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Image optimization
  images: (() => {
    const defaultDomains = ['localhost', '127.0.0.1', 'minio', 'host.docker.internal']
    const extra = new Set()
    // Allow override via env (comma-separated)
    if (process.env.NEXT_IMAGE_DOMAINS) {
      process.env.NEXT_IMAGE_DOMAINS.split(',').map(d => d.trim()).filter(Boolean).forEach(d => extra.add(d))
    }
    // Include MINIO_PUBLIC_ENDPOINT hostname if provided
    const mpe = process.env.MINIO_PUBLIC_ENDPOINT
    if (mpe) {
      try {
        let url = mpe
        if (!/^https?:\/\//i.test(url)) url = `http://${url}`
        const u = new URL(url)
        if (u.hostname) extra.add(u.hostname)
      } catch {
        // ignore parse errors
      }
    }
    const domains = Array.from(new Set([...defaultDomains, ...Array.from(extra)]))
    return {
      domains,
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920],
      imageSizes: [16, 32, 48, 64, 96, 128, 256],
      minimumCacheTTL: 60,
    }
  })(),

  // Compression
  compress: true,

  // Production optimizations
  // Enable source maps in production to get readable stack traces for debugging
  productionBrowserSourceMaps: true,

  // Output optimization
  output: 'standalone',

  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    // Disable optimizeCss to avoid requiring 'critters' during build
    optimizeCss: false,
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Fix for react-pdf canvas dependency issue
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    }

    // Ignore node-specific modules in client bundle
    if (!isServer) {
      config.externals = config.externals || {}
      config.externals = [...(Array.isArray(config.externals) ? config.externals : [config.externals]), {
        canvas: 'canvas',
      }]
    }

    // Production optimizations
    if (!dev && !isServer) {
      // Code splitting optimization
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
            icons: {
              name: 'icons',
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              priority: 30,
            },
            animations: {
              name: 'animations',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              priority: 30,
            },
          },
        },
      };
    }
    return config;
  },

  // API rewrites
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Important: when running in Docker, the Next.js server runs inside a container
        // and must reach the backend via its service name, not localhost.
        destination: `${process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000'}/api/:path*`,
      },
    ];
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
