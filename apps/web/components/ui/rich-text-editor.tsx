'use client'

import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { useCallback, useEffect } from 'react'

interface RichTextEditorLabels {
  bold?: string
  italic?: string
  underline?: string
  heading2?: string
  heading3?: string
  bulletList?: string
  orderedList?: string
  blockquote?: string
  link?: string
  clearFormatting?: string
  linkPrompt?: string
}

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  labels?: RichTextEditorLabels
}

const defaultLabels: Required<RichTextEditorLabels> = {
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bulletList: 'Bullet List',
  orderedList: 'Ordered List',
  blockquote: 'Blockquote',
  link: 'Link',
  clearFormatting: 'Clear Formatting',
  linkPrompt: 'Enter URL:',
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  labels: labelsProp,
}: RichTextEditorProps) {
  const labels = { ...defaultLabels, ...labelsProp }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder || '',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] px-3 py-2',
      },
    },
  })

  // Sync external content changes (e.g. ISBN lookup filling in description)
  useEffect(() => {
    if (!editor) return
    const currentHtml = editor.getHTML()
    // Only update if content is genuinely different (avoid cursor reset)
    if (content && content !== currentHtml && content !== '<p></p>') {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt(labels.linkPrompt, previousUrl || 'https://')

    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor, labels.linkPrompt])

  if (!editor) return null

  return (
    <div className="rounded-md border border-input bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b border-input p-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title={labels.bold}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title={labels.italic}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title={labels.underline}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title={labels.heading2}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title={labels.heading3}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title={labels.bulletList}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title={labels.orderedList}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title={labels.blockquote}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title={labels.link}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title={labels.clearFormatting}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function ToolbarSeparator() {
  return <div className="mx-0.5 w-px self-stretch bg-border" />
}
