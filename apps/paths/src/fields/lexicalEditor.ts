import { lexicalEditor, BlocksFeature } from '@payloadcms/richtext-lexical'
import { VideoEmbed } from '../blocks/VideoEmbed/config'
import { AudioEmbed } from '../blocks/AudioEmbed/config'
import { Callout } from '../blocks/Callout/config'
import { CodeBlock } from '../blocks/CodeBlock/config'
import { PDFViewer } from '../blocks/PDFViewer/config'
import { ImageGallery } from '../blocks/ImageGallery/config'
import { QuizQuestion } from '../blocks/QuizQuestion/config'

export const richTextEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    BlocksFeature({
      blocks: [VideoEmbed, AudioEmbed, Callout, CodeBlock, PDFViewer, ImageGallery, QuizQuestion],
    }),
  ],
})
