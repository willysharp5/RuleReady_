'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Copy, Check, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Link as LinkIcon, Undo, Redo, Underline as UnderlineIcon, Code, Strikethrough } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TurndownService from 'turndown'
import { remark } from 'remark'
import remarkHtml from 'remark-html'

interface TiptapEditorModalProps {
  isOpen: boolean
  onClose: () => void
  initialContent: string // Markdown content
  title?: string
  onSave?: (markdown: string) => void | Promise<void>
  showSaveButton?: boolean
}

export function TiptapEditorModal({ 
  isOpen, 
  onClose, 
  initialContent, 
  title = 'Edit Document',
  onSave,
  showSaveButton = true
}: TiptapEditorModalProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [copiedFormat, setCopiedFormat] = useState<'docs' | 'markdown' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Turndown service for HTML to Markdown conversion
  const turndownService = useRef(new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
  }))
  
  // Tiptap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline',
        },
      }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  }, [])
  
  // Convert markdown to HTML
  const markdownToHtml = async (markdown: string) => {
    const result = await remark()
      .use(remarkHtml)
      .process(markdown)
    return String(result)
  }
  
  // Load initial content when modal opens
  useEffect(() => {
    if (isOpen && initialContent && editor) {
      markdownToHtml(initialContent).then(html => {
        editor.commands.setContent(html)
      })
    }
  }, [isOpen, initialContent, editor])
  
  const handleCopyForDocs = async () => {
    const html = editor?.getHTML() || ''
    try {
      const blob = new Blob([html], { type: 'text/html' })
      const clipboardItem = new ClipboardItem({ 'text/html': blob })
      await navigator.clipboard.write([clipboardItem])
      setCopiedFormat('docs')
      setTimeout(() => setCopiedFormat(null), 2000)
    } catch (error) {
      await navigator.clipboard.writeText(html)
      setCopiedFormat('docs')
      setTimeout(() => setCopiedFormat(null), 2000)
    }
  }
  
  const handleCopyMarkdown = async () => {
    const html = editor?.getHTML() || ''
    const markdown = turndownService.current.turndown(html)
    await navigator.clipboard.writeText(markdown)
    setCopiedFormat('markdown')
    setTimeout(() => setCopiedFormat(null), 2000)
  }
  
  const handleSave = async () => {
    if (!onSave) return
    
    setIsSaving(true)
    try {
      const html = editor?.getHTML() || ''
      const markdown = turndownService.current.turndown(html)
      await onSave(markdown)
    } finally {
      setIsSaving(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Dark backdrop */}
      <div 
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative bg-white rounded-lg shadow-2xl w-[90vw] max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-2">
            {/* Copy Buttons */}
            <Button
              onClick={handleCopyForDocs}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
            >
              {copiedFormat === 'docs' ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy for Docs
                </>
              )}
            </Button>
            <Button
              onClick={handleCopyMarkdown}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
            >
              {copiedFormat === 'markdown' ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Markdown
                </>
              )}
            </Button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tiptap Editor with Toolbar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar - Always at Top */}
          {editor && (
            <div className="flex-shrink-0 border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
              {/* Undo/Redo */}
              <button
                onClick={() => editor.chain().focus().undo().run()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"
                title="Undo"
                disabled={!editor.can().undo()}
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().redo().run()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"
                title="Redo"
                disabled={!editor.can().redo()}
              >
                <Redo className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              {/* Heading Dropdown */}
              <select
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'p') {
                    editor.chain().focus().setParagraph().run()
                  } else {
                    const level = parseInt(value) as 1 | 2 | 3
                    editor.chain().focus().toggleHeading({ level }).run()
                  }
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                value={
                  editor.isActive('heading', { level: 1 }) ? '1' :
                  editor.isActive('heading', { level: 2 }) ? '2' :
                  editor.isActive('heading', { level: 3 }) ? '3' : 'p'
                }
              >
                <option value="p">Normal</option>
                <option value="1">H1</option>
                <option value="2">H2</option>
                <option value="3">H3</option>
              </select>
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              {/* Lists */}
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-purple-100' : ''}`}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-purple-100' : ''}`}
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              {/* Text Formatting */}
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-purple-100' : ''}`}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-purple-100' : ''}`}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-purple-100' : ''}`}
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('code') ? 'bg-purple-100' : ''}`}
                title="Inline Code"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-purple-100' : ''}`}
                title="Underline"
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              {/* Link */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (editor.isActive('link')) {
                      const currentUrl = editor.getAttributes('link').href
                      setLinkUrl(currentUrl || '')
                    }
                    setShowLinkInput(!showLinkInput)
                  }}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-purple-100' : ''}`}
                  title={editor.isActive('link') ? "Edit/Remove Link" : "Insert Link"}
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                
                {/* Link Input Popover */}
                {showLinkInput && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-72 z-20">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {editor.isActive('link') ? 'Edit URL:' : 'Enter URL:'}
                    </label>
                    <div className="relative mb-2">
                      <Input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="text-sm pr-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (linkUrl) {
                              editor.chain().focus().setLink({ href: linkUrl }).run()
                            }
                            setLinkUrl('')
                            setShowLinkInput(false)
                          }
                          if (e.key === 'Escape') {
                            setLinkUrl('')
                            setShowLinkInput(false)
                          }
                        }}
                        autoFocus
                      />
                      {editor.isActive('link') && (
                        <button
                          onClick={() => {
                            editor.chain().focus().unsetLink().run()
                            setLinkUrl('')
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full p-1"
                          title="Remove link"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => {
                          setLinkUrl('')
                          setShowLinkInput(false)
                        }}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (linkUrl) {
                            editor.chain().focus().setLink({ href: linkUrl }).run()
                          }
                          setLinkUrl('')
                          setShowLinkInput(false)
                        }}
                        size="sm"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {editor.isActive('link') ? 'Update' : 'Insert'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Editor Content - Scrollable */}
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
            <EditorContent editor={editor} />
          </div>
          
          <style jsx global>{`
            .tiptap {
              min-height: 500px;
              padding: 1rem;
              font-size: 14px;
              line-height: 1.6;
              color: #111827;
            }
            .tiptap:focus {
              outline: 2px solid #a855f7;
              outline-offset: -2px;
            }
            
            /* Headers */
            .tiptap h1 {
              font-size: 1.125rem;
              font-weight: bold;
              margin-bottom: 0.5rem;
              margin-top: 0.75rem;
              color: #111827;
            }
            .tiptap h2 {
              font-size: 1rem;
              font-weight: bold;
              margin-top: 0.75rem;
              margin-bottom: 0.25rem;
              color: #1f2937;
            }
            .tiptap h3 {
              font-size: 0.875rem;
              font-weight: bold;
              margin-top: 0.5rem;
              margin-bottom: 0.25rem;
              color: #374151;
            }
            
            /* Paragraphs and lists */
            .tiptap p {
              margin-bottom: 0.5rem;
              line-height: 1.6;
            }
            .tiptap ul, .tiptap ol {
              margin-left: 1rem;
              margin-bottom: 0.5rem;
            }
            .tiptap li {
              list-style-type: disc;
              margin-bottom: 0.125rem;
              line-height: 1.5;
            }
            
            /* Links and formatting */
            .tiptap a {
              color: #2563eb;
              text-decoration: underline;
              cursor: pointer;
              font-weight: 500;
            }
            .tiptap a:hover {
              color: #1d4ed8;
            }
            .tiptap strong {
              font-weight: 600;
              color: #111827;
            }
            .tiptap code {
              background-color: #f3f4f6;
              padding: 0.125rem 0.25rem;
              border-radius: 0.25rem;
              font-family: monospace;
              font-size: 0.875em;
              color: #dc2626;
            }
            .tiptap hr {
              border: none;
              border-top: 2px solid #d1d5db;
              margin: 1.5rem 0;
            }
          `}</style>
        </div>
        
        {/* Footer with actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Click and edit content above
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            {showSaveButton && onSave && (
              <Button
                onClick={handleSave}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

