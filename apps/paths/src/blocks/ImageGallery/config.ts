import type { Block } from 'payload'

export const ImageGallery: Block = {
  slug: 'imageGallery',
  interfaceName: 'ImageGalleryBlock',
  labels: { singular: 'Image Gallery', plural: 'Image Galleries' },
  fields: [
    {
      name: 'images',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text' },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Carousel', value: 'carousel' },
      ],
    },
  ],
}
