import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let url = serverUrl + '/website-template-OG.webp'

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url
  }

  return url
}

export const generateMeta = async (args: {
  doc: (Partial<Page> | Partial<Post> | Record<string, any>) | null
}): Promise<Metadata> => {
  const { doc } = args

  const ogImage = getImageURL(doc?.meta?.image)

  // Fall back to doc.title if meta.title is not set
  const rawTitle = doc?.meta?.title || doc?.title
  const title = rawTitle ? rawTitle + ' | PATHS by LIMITLESS' : 'PATHS by LIMITLESS'

  // Fall back to doc.excerpt or doc.description if meta.description is not set
  const description = doc?.meta?.description || doc?.excerpt || doc?.description || ''

  return {
    description: description || undefined,
    openGraph: mergeOpenGraph({
      description,
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/',
    }),
    title,
  }
}
