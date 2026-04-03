import React from 'react'
import { cn } from '@/utilities/ui'

function getEmbedUrl(src: string): string {
  // YouTube
  const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`

  // Vimeo
  const vimeoMatch = src.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return src
}

export const VideoEmbed: React.FC<{
  src: string
  title?: string
  caption?: string
  className?: string
}> = ({ src, title = 'Video', caption, className }) => {
  const embedUrl = getEmbedUrl(src)

  return (
    <figure className={cn('my-8', className)}>
      <div className="relative w-full rounded-lg overflow-hidden border border-border" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
