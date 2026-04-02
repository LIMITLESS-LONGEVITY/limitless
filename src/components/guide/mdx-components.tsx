import React from 'react'
import { Screenshot } from './Screenshot'
import { Callout } from './Callout'
import { StepList, Step } from './StepList'
import { RoleTag } from './RoleTag'
import { CodeBlock } from './CodeBlock'
import { Tabs, TabList, Tab, TabPanel } from './Tabs'
import { Accordion, AccordionItem } from './Accordion'
import { KeyboardShortcut } from './KeyboardShortcut'
import { VideoEmbed } from './VideoEmbed'

export const guideComponents = {
  Screenshot,
  Callout,
  StepList,
  Step,
  RoleTag,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Accordion,
  AccordionItem,
  KeyboardShortcut,
  VideoEmbed,
  // Override default HTML elements for consistent styling
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-3xl font-display font-bold text-foreground mb-4 mt-8 first:mt-0" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-2xl font-display font-semibold text-foreground mb-3 mt-8" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-xl font-display font-semibold text-foreground mb-2 mt-6" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-sm leading-relaxed text-foreground/80 mb-4" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside space-y-1.5 text-sm text-foreground/80 mb-4 ml-2" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground/80 mb-4 ml-2" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-brand-gold hover:text-brand-gold/80 underline underline-offset-2 transition-colors" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono" {...props} />
  ),
  pre: CodeBlock,
  blockquote: (props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 border-brand-gold/50 pl-4 my-4 italic text-muted-foreground" {...props} />
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="text-left p-2 border-b border-border font-semibold text-foreground" {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="p-2 border-b border-border text-foreground/80" {...props} />
  ),
}
