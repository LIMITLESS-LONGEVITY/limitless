import type { Block } from 'payload'

export const VideoEmbed: Block = {
  slug: 'videoEmbed',
  interfaceName: 'VideoEmbedBlock',
  labels: { singular: 'Video Embed', plural: 'Video Embeds' },
  fields: [
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
      ],
    },
    { name: 'url', type: 'text', required: true, label: 'Video URL' },
    { name: 'videoId', type: 'text', label: 'Video ID (auto-extracted)' },
    { name: 'caption', type: 'text' },
  ],
}
