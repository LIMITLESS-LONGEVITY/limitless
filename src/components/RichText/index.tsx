import { MediaBlock } from '@/blocks/MediaBlock/Component'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from '@payloadcms/richtext-lexical'
import {
  JSXConvertersFunction,
  LinkJSXConverter,
  RichText as ConvertRichText,
} from '@payloadcms/richtext-lexical/react'

import { CodeBlock, CodeBlockProps } from '@/blocks/Code/Component'

import type {
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  MediaBlock as MediaBlockProps,
} from '@/payload-types'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { cn } from '@/utilities/ui'
import { QuizBlock } from '@/components/QuizBlock'
import React from 'react'

const calloutStyles: Record<string, { border: string; bg: string; icon: string }> = {
  info: { border: 'border-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'ℹ️' },
  warning: { border: 'border-brand-gold', bg: 'bg-brand-gold-dim', icon: '⚠️' },
  tip: { border: 'border-green-400', bg: 'bg-green-50 dark:bg-green-950/30', icon: '💡' },
  quote: { border: 'border-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/30', icon: '💬' },
}

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<CTABlockProps | MediaBlockProps | BannerBlockProps | CodeBlockProps>

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  if (typeof value !== 'object') {
    throw new Error('Expected value to be an object')
  }
  const slug = value.slug
  return relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  blocks: {
    banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
    mediaBlock: ({ node }) => (
      <MediaBlock
        className="col-start-1 col-span-3"
        imgClassName="m-0"
        {...node.fields}
        captionClassName="mx-auto max-w-[48rem]"
        enableGutter={false}
        disableInnerContainer={true}
      />
    ),
    code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
    cta: ({ node }) => <CallToActionBlock {...node.fields} />,
    quizQuestion: ({ node }) => <QuizBlock {...node.fields} />,
    callout: ({ node }) => {
      const { type, content } = node.fields as any
      const style = calloutStyles[type] || calloutStyles.info
      return (
        <div className={cn('my-6 rounded-lg border-l-4 p-4', style.border, style.bg)}>
          <div className="flex gap-2">
            <span className="shrink-0">{style.icon}</span>
            <div className="prose dark:prose-invert prose-sm max-w-none">
              {content && <ConvertRichText converters={jsxConverters} data={content} />}
            </div>
          </div>
        </div>
      )
    },
    videoEmbed: ({ node }) => {
      const { platform, videoId, url, caption } = node.fields as any
      const extractYouTubeId = (u: string) =>
        u?.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]+)/)?.[1] || ''
      const extractVimeoId = (u: string) =>
        u?.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || ''
      const embedUrl = platform === 'youtube'
        ? `https://www.youtube.com/embed/${videoId || extractYouTubeId(url)}`
        : `https://player.vimeo.com/video/${videoId || extractVimeoId(url)}`
      return (
        <div className="my-6">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={embedUrl}
              title={caption || 'Embedded video'}
              className="absolute inset-0 w-full h-full rounded-lg"
              frameBorder={0}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          {caption && <p className="text-sm text-muted-foreground mt-2 text-center">{caption}</p>}
        </div>
      )
    },
    audioEmbed: ({ node }) => {
      const { url, caption } = node.fields as any
      return (
        <div className="my-6">
          <iframe src={url} className="w-full h-20 rounded-lg" allow="autoplay" />
          {caption && <p className="text-sm text-muted-foreground mt-2">{caption}</p>}
        </div>
      )
    },
    pdfViewer: ({ node }) => {
      const { file, title } = node.fields as any
      const fileUrl = typeof file === 'object' ? file?.url : ''
      return (
        <div className="my-6">
          {title && <p className="text-sm font-medium mb-2">{title}</p>}
          <iframe src={fileUrl} className="w-full h-[600px] rounded-lg border border-border" />
        </div>
      )
    },
    imageGallery: ({ node }) => {
      const { images, layout } = node.fields as any
      return (
        <div className={cn('my-6 gap-4', layout === 'grid' ? 'grid grid-cols-2 md:grid-cols-3' : 'flex overflow-x-auto')}>
          {(images || []).map((img: any, i: number) => (
            <div key={i} className="rounded-lg overflow-hidden bg-muted">
              {img.image && typeof img.image === 'object' && (
                <img src={img.image.url} alt={img.caption || ''} className="w-full h-auto" />
              )}
              {img.caption && <p className="text-xs text-muted-foreground p-2">{img.caption}</p>}
            </div>
          ))}
        </div>
      )
    },
  },
})

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, ...rest } = props
  return (
    <ConvertRichText
      converters={jsxConverters}
      className={cn(
        'payload-richtext',
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md dark:prose-invert': enableProse,
        },
        className,
      )}
      {...rest}
    />
  )
}
