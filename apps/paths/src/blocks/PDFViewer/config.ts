import type { Block } from 'payload'

export const PDFViewer: Block = {
  slug: 'pdfViewer',
  interfaceName: 'PDFViewerBlock',
  labels: { singular: 'PDF Viewer', plural: 'PDF Viewers' },
  fields: [
    { name: 'file', type: 'upload', relationTo: 'media', required: true },
    { name: 'title', type: 'text' },
  ],
}
