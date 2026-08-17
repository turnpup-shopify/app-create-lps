import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The heading prompt is read from disk at request time so a writer can edit it
  // without touching component code. Trace it into the serverless bundle.
  outputFileTracingIncludes: {
    '/api/headings': ['./lib/prompts/**'],
  },
}

export default nextConfig
