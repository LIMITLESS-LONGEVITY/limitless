export function extractTextFromLexical(content: any): string {
  if (!content) return ''
  const root = content.root ?? content
  if (!root?.children) return ''
  return extractChildren(root.children)
}

function extractChildren(children: any[]): string {
  const blocks: string[] = []
  for (const node of children) {
    if (node.type === 'text' && node.text) {
      blocks.push(node.text)
    } else if (node.children) {
      const text = extractChildren(node.children)
      if (text) blocks.push(text)
    }
  }
  return blocks.join('\n\n')
}
