import type { Block } from 'payload'

export const AudioEmbed: Block = {
  slug: 'audioEmbed',
  interfaceName: 'AudioEmbedBlock',
  labels: { singular: 'Audio Embed', plural: 'Audio Embeds' },
  fields: [
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'SoundCloud', value: 'soundcloud' },
        { label: 'Spotify', value: 'spotify' },
      ],
    },
    { name: 'url', type: 'text', required: true, label: 'Audio URL' },
    { name: 'caption', type: 'text' },
  ],
}
