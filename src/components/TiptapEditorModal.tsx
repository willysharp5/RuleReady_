'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Copy, Check, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Link as LinkIcon, Undo, Redo, Underline as UnderlineIcon, Code, Strikethrough, ExternalLink, Pencil, Trash2, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TurndownService from 'turndown'
import { remark } from 'remark'
import remarkHtml from 'remark-html'
import { AiFloatingMenu } from '@/components/ui/ai-floating-menu'

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
  const [linkPopover, setLinkPopover] = useState<{ x: number; y: number; url: string; isEditing: boolean } | null>(null)
  const [editorKey, setEditorKey] = useState(0) // Force re-render
  
  // AI Menu state
  const [showAiMenu, setShowAiMenu] = useState(false)
  const [aiMenuPosition, setAiMenuPosition] = useState({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [aiGeneratedText, setAiGeneratedText] = useState('')
  const [aiGeneratedPosition, setAiGeneratedPosition] = useState<number | null>(null)
  
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
      StarterKit.configure({
        history: {
          depth: 100,
          newGroupDelay: 500,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline cursor-pointer',
        },
      }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement
        if (target.tagName === 'A') {
          event.preventDefault()
          const href = target.getAttribute('href')
          if (href) {
            // Show link popover at click position
            const rect = target.getBoundingClientRect()
            setLinkPopover({
              x: rect.left + rect.width / 2,
              y: rect.bottom + 5,
              url: href,
              isEditing: false
            })
            // Set the link URL and select the link
            setLinkUrl(href)
            // Position cursor in the link
            const { from, to } = view.state.selection
            const linkMark = view.state.doc.resolve(pos).marks().find(m => m.type.name === 'link')
            if (linkMark) {
              // Find the range of the link
              let linkFrom = pos
              let linkTo = pos
              view.state.doc.nodesBetween(pos - 10, pos + 10, (node, nodePos) => {
                if (node.marks.some(m => m === linkMark)) {
                  if (nodePos < linkFrom) linkFrom = nodePos
                  if (nodePos + node.nodeSize > linkTo) linkTo = nodePos + node.nodeSize
                }
              })
              // Select the link text
              view.dispatch(view.state.tr.setSelection(
                view.state.tr.selection.constructor.create(view.state.doc, linkFrom, linkTo)
              ))
            }
          }
          return true
        }
        return false
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
        // Set content and add to history by making a change
        editor.commands.setContent(html)
        // Make a dummy edit to create undo history and force re-render
        setTimeout(() => {
          const { from } = editor.state.selection
          editor.chain().focus().insertContent(' ').deleteRange({ from, to: from + 1 }).run()
          // Force component re-render to update button states
          setEditorKey(prev => prev + 1)
          
          // Scroll to top and position cursor at start
          editor.commands.focus('start')
          const editorElement = editor.view.dom
          if (editorElement) {
            editorElement.scrollTop = 0
          }
        }, 50)
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
  
  // Generate AI text (shows in popover only)
  const handleAiGenerate = async (prompt: string) => {
    if (!editor || !selectionRange) return
    
    const { from, to } = selectionRange
    const text = editor.state.doc.textBetween(from, to, ' ')
    
    if (!text.trim()) return
    
    setIsAiProcessing(true)
    setAiGeneratedText('')
    
    try {
      const response = await fetch('/api/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          action: 'custom',
          customPrompt: prompt,
        }),
      })
      
      if (!response.ok) {
        throw new Error('AI edit failed')
      }
      
      // Stream the response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullResult = ''
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line)
              
              if (data.chunk) {
                fullResult += data.chunk
                setAiGeneratedText(fullResult)
              }
              
              if (data.done && data.result) {
                setAiGeneratedText(data.result)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('AI generation failed:', error)
      setAiGeneratedText('')
      alert('AI generation failed. Please try again.')
    } finally {
      setIsAiProcessing(false)
    }
  }
  
  // Apply AI generated text to editor (convert markdown to HTML first)
  const handleAiApply = async () => {
    if (!editor || !selectionRange || !aiGeneratedText) return
    
    const { from, to } = selectionRange
    
    // Convert markdown to HTML before inserting
    try {
      const html = await markdownToHtml(aiGeneratedText)
      
      // Replace selected text with formatted AI text
      editor.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, html)
        .run()
    } catch (error) {
      // Fallback: insert as plain text if conversion fails
      editor.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, aiGeneratedText)
        .run()
    }
    
    // Clear AI state
    setAiGeneratedText('')
    setAiGeneratedPosition(null)
    setSelectedText('')
    setSelectionRange(null)
  }
  
  // Discard AI generated text
  const handleAiDiscard = () => {
    setAiGeneratedText('')
    setAiGeneratedPosition(null)
  }
  
  // Try again - regenerate (will be handled by menu component passing last prompt)
  const handleAiTryAgain = () => {
    // This is handled by the menu component now - it stores and resends the last prompt
  }
  
  // Track selection changes (but don't auto-show menu)
  useEffect(() => {
    if (!editor) return
    
    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to, ' ')
      
      if (text.trim().length > 0 && from !== to) {
        setSelectedText(text)
        setSelectionRange({ from, to })
      } else {
        setSelectedText('')
        setSelectionRange(null)
        setShowAiMenu(false)
      }
    }
    
    editor.on('selectionUpdate', handleSelectionUpdate)
    
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor])
  
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
        {/* Close button - Top Right Corner */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1.5"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Header */}
        <div className="p-4 pr-12 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
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
          </div>
        </div>
        
        {/* Tiptap Editor with Toolbar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar - Always at Top */}
          {editor && (
            <div key={editorKey} className="flex-shrink-0 border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
              {/* Undo/Redo */}
              <button
                onClick={() => {
                  editor.chain().focus().undo().run()
                  setEditorKey(prev => prev + 1)
                }}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"
                title="Undo"
                disabled={!editor.can().undo()}
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().redo().run()
                  setEditorKey(prev => prev + 1)
                }}
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
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              {/* AI Button - Always purple */}
              <button
                onClick={() => {
                  if (selectedText && selectionRange) {
                    // Position menu at bottom center of selection
                    const selection = window.getSelection()
                    if (selection && selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0)
                      const rect = range.getBoundingClientRect()
                      setAiMenuPosition({
                        top: rect.bottom + 8,
                        left: rect.left + (rect.width / 2) - 50
                      })
                      setShowAiMenu(true)
                    }
                  }
                }}
                className="p-2 rounded text-purple-600 hover:bg-purple-100 disabled:opacity-30"
                title="Ask AI (select text first)"
                disabled={!selectedText}
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Editor Content - Scrollable */}
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg relative">
            <EditorContent editor={editor} />
            
            {/* Link Edit Popover */}
            {linkPopover && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setLinkPopover(null)}
                />
                <div 
                  className="fixed z-20 bg-white border border-gray-300 rounded-lg shadow-xl p-3 w-80"
                  style={{
                    left: `${linkPopover.x}px`,
                    top: `${linkPopover.y}px`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">Link Options</span>
                    <button
                      onClick={() => setLinkPopover(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {/* URL Display or Edit Input */}
                    {linkPopover.isEditing ? (
                      <Input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="text-xs h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (linkUrl && linkUrl !== linkPopover.url) {
                              editor?.chain().focus().setLink({ href: linkUrl }).run()
                            }
                            setLinkPopover(null)
                            setLinkUrl('')
                          }
                          if (e.key === 'Escape') {
                            setLinkPopover({ ...linkPopover, isEditing: false })
                          }
                        }}
                      />
                    ) : (
                      <div className="text-xs text-gray-600 truncate bg-gray-50 p-2 rounded">
                        {linkPopover.url}
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {!linkPopover.isEditing && (
                        <Button
                          onClick={() => {
                            window.open(linkPopover.url, '_blank')
                            setLinkPopover(null)
                          }}
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          if (linkPopover.isEditing) {
                            // Update the link
                            if (linkUrl && linkUrl !== linkPopover.url) {
                              editor?.chain().focus().setLink({ href: linkUrl }).run()
                            }
                            setLinkPopover(null)
                            setLinkUrl('')
                          } else {
                            // Switch to edit mode
                            setLinkUrl(linkPopover.url)
                            setLinkPopover({ ...linkPopover, isEditing: true })
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                      >
                        {linkPopover.isEditing ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Update
                          </>
                        ) : (
                          <>
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          editor?.chain().focus().unsetLink().run()
                          setLinkPopover(null)
                        }}
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
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
            
            /* Hide AI markers from display */
            .tiptap:has-text('[AI_GENERATED_START]') {
              white-space: pre-wrap;
            }
          `}</style>
          
          {/* Custom styling to make AI generated text blue */}
          <style jsx global>{`
            /* Find text between markers and style it */
            .ProseMirror {
              white-space: pre-wrap;
            }
            /* This is a hack - we'll need to use a proper TipTap mark/node for production */
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
      
      {/* AI Floating Menu */}
      <AiFloatingMenu
        isVisible={showAiMenu}
        position={aiMenuPosition}
        selectedText={selectedText}
        onGenerate={handleAiGenerate}
        onApply={handleAiApply}
        onDiscard={handleAiDiscard}
        onTryAgain={handleAiTryAgain}
        isProcessing={isAiProcessing}
        generatedText={aiGeneratedText}
        onClose={() => {
          setShowAiMenu(false)
          setAiGeneratedText('')
        }}
      />
    </div>
  )
}

