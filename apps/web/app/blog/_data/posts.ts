export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string
  tags: string[]
  author: string
  readingTimeMin: number
}

export const posts: BlogPost[] = [
  {
    slug: 'seeloudfn-runtime',
    title: 'Inside seeloudfn-runtime: How Seeloud Executes Serverless Functions',
    description:
      'A deep technical dive into seeloudfn-runtime — the Bun-based execution engine that manages warm workerd V8 pools, BullMQ job routing, and R2-cached bundles to run serverless functions on Seeloud with sub-millisecond warm latency.',
    publishedAt: '2026-06-01',
    tags: ['serverless', 'workerd', 'v8', 'bullmq', 'architecture'],
    author: 'Seeloud Engineering',
    readingTimeMin: 18,
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug)
}
