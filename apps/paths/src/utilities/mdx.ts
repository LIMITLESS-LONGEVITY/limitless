import fs from 'fs'
import path from 'path'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { guideComponents } from '@/components/guide/mdx-components'

const GUIDE_CONTENT_DIR = path.join(process.cwd(), 'content', 'guide')

export async function getGuideContent(role: string, topic: string) {
  const filePath = path.join(GUIDE_CONTENT_DIR, role, `${topic}.mdx`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const source = fs.readFileSync(filePath, 'utf-8')

  const { content, frontmatter } = await compileMDX<{ title: string; description?: string }>({
    source,
    components: guideComponents,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
      },
    },
  })

  return { content, frontmatter }
}

export function guideContentExists(role: string, topic: string): boolean {
  const filePath = path.join(GUIDE_CONTENT_DIR, role, `${topic}.mdx`)
  return fs.existsSync(filePath)
}
