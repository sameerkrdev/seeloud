import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { posts, getPost } from '../_data/posts'
import { SeeloudfnRuntimePost } from '../_posts/seeloudfn-runtime'
import { SeeloudActionPost } from '../_posts/seeloud-action'

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}

  const url = `https://seeloud.sameerkr.dev/blog/${post.slug}`

  return {
    title: `${post.title} — Seeloud Blog`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

const postComponents: Record<string, React.ComponentType> = {
  'seeloudfn-runtime': SeeloudfnRuntimePost,
  'seeloud-action': SeeloudActionPost,
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const PostContent = postComponents[slug]
  if (!PostContent) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: 'Seeloud' },
    url: `https://seeloud.sameerkr.dev/blog/${post.slug}`,
    keywords: post.tags.join(', '),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostContent />
    </>
  )
}
