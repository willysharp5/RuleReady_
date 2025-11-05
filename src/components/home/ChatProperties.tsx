'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Settings, Info, Tag, Building2, X, BookOpen, AlertCircle } from 'lucide-react'
import { AccordionSection } from './AccordionSection'
import { JurisdictionSelect } from '@/components/ui/jurisdiction-select'
import { TopicSelect } from '@/components/ui/topic-select'
import { SavedResearchSelect } from '@/components/ui/saved-research-select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface ChatState {
  systemPrompt: string
  model?: string
  jurisdiction: string
  topic: string
  additionalContext?: string
  savedResearchContent?: string
  selectedResearchIds?: string[]
  lastPromptSent?: string
}

interface ChatPropertiesProps {
  chatState?: ChatState
  setChatState?: (state: ChatState) => void
  updateChatSettings?: (args: { chatSystemPrompt?: string; chatModel?: string; chatAdditionalContext?: string }) => Promise<{ success: boolean }>
}

export function ChatProperties({ chatState, setChatState, updateChatSettings }: ChatPropertiesProps = {}) {
  // Query data
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const topicsQuery = useQuery(api.complianceQueries.getTopics)
  const savedResearchQuery = useQuery(api.savedResearch.getAllSavedResearch)
  
  const jurisdictions = jurisdictionsQuery || []
  const topics = topicsQuery || []
  const savedResearch = savedResearchQuery || []
  
  const selectedJurisdiction = jurisdictions.find((j: { name: string }) => j.name === chatState?.jurisdiction) || null
  const selectedTopic = topics.find((t: { name: string }) => t.name === chatState?.topic) || null
  const selectedResearchItems = savedResearch.filter((r: { _id: string }) => 
    chatState?.selectedResearchIds?.includes(r._id)
  ) || []
  
  const [systemPromptOpen, setSystemPromptOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false)
  
  // Debounce timer refs
  const promptSaveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const contextSaveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  // Saving indicators
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)
  
  // Cleanup timers
  useEffect(() => {
    return () => {
      if (promptSaveTimerRef.current) clearTimeout(promptSaveTimerRef.current)
    }
  }, [])
  
  const handleSystemPromptChange = (prompt: string) => {
    // Update local state immediately
    if (setChatState && chatState) {
      setChatState({ ...chatState, systemPrompt: prompt })
    }
    
    setPromptSaved(false)
    setIsSavingPrompt(true)
    
    // Debounce database save
    if (promptSaveTimerRef.current) {
      clearTimeout(promptSaveTimerRef.current)
    }
    promptSaveTimerRef.current = setTimeout(async () => {
      if (updateChatSettings) {
        await updateChatSettings({
          chatSystemPrompt: prompt,
          chatModel: chatState?.model
        })
        setIsSavingPrompt(false)
        setPromptSaved(true)
        setTimeout(() => setPromptSaved(false), 2000)
      }
    }, 1000) // Save 1 second after user stops typing
  }

  const handleAdditionalContextChange = (value: string) => {
    if (setChatState && chatState) {
      setChatState({ ...chatState, additionalContext: value })
    }
    if (!updateChatSettings) return;
    if (contextSaveTimerRef.current) clearTimeout(contextSaveTimerRef.current)
    contextSaveTimerRef.current = setTimeout(() => {
      updateChatSettings({
        chatSystemPrompt: chatState?.systemPrompt,
        chatModel: chatState?.model,
        chatAdditionalContext: value,
      })
    }, 500)
  }
  
  const handleModelChange = (model: string) => {
    // Update local state immediately
    if (setChatState && chatState) {
      setChatState({ ...chatState, model })
    }
    
    // Save to database immediately
    if (updateChatSettings) {
      updateChatSettings({
        chatSystemPrompt: chatState?.systemPrompt,
        chatModel: model
      })
    }
  }
  
  const handleResetPrompt = () => {
    const defaultPrompt = `You are RuleReady Compliance Evaluation AI. Answer questions using ONLY the saved research provided.

CRITICAL RULES:
1. ONLY use SAVED RESEARCH for legal info - NO AI knowledge
2. Use ADDITIONAL CONTEXT for company details (company name, location, employee count)
3. Cite saved research as [1], [2], [3]

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

# [Clear Title Based on Question]

## Overview

Answer the question directly in 2-3 sentences. Mention **company name** if provided. Cite sources [1], [2].

## Why This Applies

Based on [1] and [2], explain applicability:

- **Company location**: [from additional context]
- **Number of employees**: [from additional context]
- **Legal requirement**: [from saved research] [1]
- **Threshold**: [cite number] employees [1]

## Key Requirements

List the main requirements with citations:

- **Requirement 1**: Details from saved research [1]
- **Training duration**: **X hours** for supervisors, **Y hours** for employees [2]
- **Deadline**: Within **X months/days** [1]
- **Frequency**: Every **X years** [2]

## What You Need To Do

Actionable steps:

1. First action step
2. Second action step
3. Third action step

## Penalties for Non-Compliance

- **Fines**: $X to $Y per violation [1]
- **Other consequences**: [from research] [2]

(Or state: "Penalties not specified in provided research")

FORMATTING:
- Use ## for all section headers
- Use **bold** for company names, numbers, deadlines, dollar amounts
- Use [1], [2], [3] to cite saved research inline
- Use bullet points for lists
- Add blank line after each paragraph
- Keep it scannable and professional

DO NOT include meta-commentary like "Answer Structure:" or "Start with direct answer:". Just write the formatted response.

IF NO SAVED RESEARCH:
"I don't have any saved research selected. Please select saved research from the knowledge base to provide legal compliance information."

IF MISSING INFO:
Be specific about what's missing and guide user to add it.`
    
    if (setChatState && chatState) {
      setChatState({ ...chatState, systemPrompt: defaultPrompt })
    }
    
    // Also save to database
    if (updateChatSettings) {
      updateChatSettings({
        chatSystemPrompt: defaultPrompt,
        chatModel: chatState?.model
      })
    }
  }

  return (
    <div className="space-y-2">
      {/* How Chat Works - Always visible at top */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">How It Works</h5>
        <div className="text-xs text-blue-800 space-y-1.5">
          <div><strong>1. Select Saved Research:</strong> Choose knowledge base items</div>
          <div><strong>2. Ask Question:</strong> With optional jurisdiction/topic filters</div>
          <div><strong>3. AI Response:</strong> Uses ONLY your saved research</div>
          <div><strong>4. Evaluation:</strong> Tests if your research is comprehensive</div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-blue-300">
          <div className="text-xs font-semibold text-blue-900 mb-1">⚠️ No Memory Between Questions</div>
          <div className="text-xs text-blue-800">
            Each question is evaluated independently. The AI does NOT remember previous questions. 
            Make sure to select saved research and provide company context for EACH new question.
          </div>
        </div>
      </div>
      
      {/* Select Saved Research - Most Important */}
      <div className="space-y-2 bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
        <Label className="text-xs font-medium text-purple-900 flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          Select Saved Research (Knowledge Base)
        </Label>
        <SavedResearchSelect
          value={selectedResearchItems}
          onChange={(items) => {
            if (setChatState && chatState) {
              if (items.length > 0) {
                // Set research IDs and content separately from additional context
                const combinedContent = items.map(item => 
                  `[SAVED RESEARCH] ${item.title}\n${item.jurisdiction ? `Jurisdiction: ${item.jurisdiction}\n` : ''}${item.topic ? `Topic: ${item.topic}\n` : ''}\n${item.content}`
                ).join('\n\n---\n\n')
                
                setChatState({ 
                  ...chatState, 
                  selectedResearchIds: items.map(i => i._id),
                  savedResearchContent: combinedContent
                })
              } else {
                // Clear selection
                setChatState({ 
                  ...chatState, 
                  selectedResearchIds: [],
                  savedResearchContent: ''
                })
              }
            }
          }}
          items={savedResearch}
          placeholder="Select saved research to use as knowledge base..."
        />
        {selectedResearchItems.length > 0 && (
          <div className="flex gap-2">
            <div className="text-xs text-purple-700 bg-white p-2 rounded border border-purple-200 flex-1">
              <div className="font-semibold mb-1">Using as Knowledge Base:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedResearchItems.map((item: { _id: string; title: string; jurisdiction?: string; topic?: string }) => (
                  <div key={item._id} className="pb-1 border-b border-purple-100 last:border-b-0">
                    <div className="font-medium truncate">{item.title}</div>
                    {(item.jurisdiction || item.topic) && (
                      <div className="text-purple-600 text-[10px]">
                        {[item.jurisdiction, item.topic].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (setChatState && chatState) {
                  setChatState({ 
                    ...chatState, 
                    selectedResearchIds: [],
                    additionalContext: ''
                  })
                }
              }}
              className="h-auto px-2"
              title="Clear all"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs text-purple-700 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span><strong>How it works:</strong> Select saved research items and the AI will use ONLY that content to answer your questions. Select multiple to combine knowledge bases!</span>
          </p>
          <p className="text-xs text-orange-700 bg-orange-50 px-2 py-1.5 rounded border border-orange-200 flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span><strong>Important:</strong> Each question is independent - the AI does NOT remember previous questions. Reselect saved research for each new question.</span>
          </p>
        </div>
      </div>
      
      {/* Filters - Jurisdiction & Topic */}
      <div className="space-y-2">
        {/* Jurisdiction Filter */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 mb-1">
            Jurisdiction (Optional)
          </label>
          <JurisdictionSelect
            value={selectedJurisdiction}
            onChange={(j) => {
              if (setChatState && chatState) {
                setChatState({ ...chatState, jurisdiction: j?.name || '' })
              }
            }}
            placeholder="All Jurisdictions"
            className="text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional - helps organize your query context
          </p>
        </div>
        
        {/* Topic Filter */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 mb-1">
            <Tag className="h-3 w-3" />
            Topic (Optional)
          </label>
          <TopicSelect
            value={selectedTopic}
            onChange={(t) => {
              if (setChatState && chatState) {
                setChatState({ ...chatState, topic: t?.name || '' })
              }
            }}
            placeholder="All Topics"
            className="text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional - helps organize your query context
          </p>
        </div>
      </div>

      <AccordionSection
        title="Additional Context"
        icon={Info}
        isOpen={contextOpen}
        onToggle={() => setContextOpen(!contextOpen)}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Reference Documents or Notes</label>
            <textarea
              rows={6}
              placeholder="Paste compliance documents, rules text, or any reference information you want the AI to consider..."
              className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md resize-y min-h-[100px] max-h-[400px]"
              value={chatState?.additionalContext || ''}
              onChange={(e) => handleAdditionalContextChange(e.target.value)}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Included in your next chat query. Persisted to your settings until you clear it.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs px-3 py-2 border border-purple-300 rounded hover:bg-purple-50 text-purple-700 flex-1 font-medium flex items-center justify-center gap-1.5"
              onClick={() => {
                const companyNames = ['TechCorp Solutions', 'Global Innovations Inc', 'Pacific Enterprises', 'Mountain View LLC', 'Coastal Industries', 'Midwest Manufacturing', 'Summit Consulting Group', 'Horizon Systems', 'Vertex Analytics', 'Nexus Solutions'];
                const states = ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Massachusetts', 'Washington', 'Colorado'];
                const cities: Record<string, string[]> = {
                  'California': ['San Francisco', 'Los Angeles', 'San Diego', 'Sacramento', 'San Jose', 'Oakland'],
                  'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
                  'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio', 'Fort Worth'],
                  'Florida': ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Fort Lauderdale'],
                  'Illinois': ['Chicago', 'Springfield', 'Naperville', 'Aurora'],
                  'Massachusetts': ['Boston', 'Cambridge', 'Worcester', 'Springfield'],
                  'Washington': ['Seattle', 'Tacoma', 'Spokane', 'Bellevue'],
                  'Colorado': ['Denver', 'Boulder', 'Colorado Springs', 'Aurora']
                };
                const firstNames = ['Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Maria', 'John', 'Jessica', 'William', 'Ashley', 'Daniel', 'Amanda', 'Christopher', 'Melissa', 'Matthew', 'Michelle', 'Joshua', 'Stephanie', 'Andrew', 'Nicole', 'Ryan', 'Heather', 'Justin', 'Elizabeth', 'Brandon', 'Rebecca', 'Kevin'];
                const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Chen', 'Patel', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Lopez', 'Hill'];
                
                const companyName = companyNames[Math.floor(Math.random() * companyNames.length)];
                const hqState = states[Math.floor(Math.random() * states.length)];
                const hqCity = cities[hqState][Math.floor(Math.random() * cities[hqState].length)];
                const totalEmployees = Math.floor(Math.random() * 150) + 15; // 15-165 employees
                
                // Generate employees across multiple states
                const numStates = Math.floor(Math.random() * 3) + 2; // 2-4 states
                const employeeStates = [hqState];
                while (employeeStates.length < numStates) {
                  const newState = states[Math.floor(Math.random() * states.length)];
                  if (!employeeStates.includes(newState)) {
                    employeeStates.push(newState);
                  }
                }
                
                // Distribute employees across states
                const stateDistribution: Record<string, number> = {};
                let remainingEmployees = totalEmployees;
                
                employeeStates.forEach((state, idx) => {
                  if (idx === employeeStates.length - 1) {
                    // Last state gets remaining
                    stateDistribution[state] = remainingEmployees;
                  } else {
                    // Random distribution, but ensure at least 3 per state
                    const maxForState = remainingEmployees - (3 * (employeeStates.length - idx - 1));
                    const minForState = 3;
                    const count = Math.floor(Math.random() * (maxForState - minForState + 1)) + minForState;
                    stateDistribution[state] = count;
                    remainingEmployees -= count;
                  }
                });
                
                // Generate ALL employee names for each state
                const employeesByState: Record<string, Array<{name: string, city: string}>> = {};
                const usedNames = new Set<string>();
                
                employeeStates.forEach(state => {
                  const count = stateDistribution[state];
                  employeesByState[state] = [];
                  
                  for (let i = 0; i < count; i++) {
                    let name: string;
                    let attempts = 0;
                    do {
                      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                      name = `${firstName} ${lastName}`;
                      attempts++;
                    } while (usedNames.has(name) && attempts < 50);
                    
                    usedNames.add(name);
                    const city = cities[state][Math.floor(Math.random() * cities[state].length)];
                    employeesByState[state].push({ name, city });
                  }
                });
                
                const companyContext = `COMPANY PROFILE:

Company Name: ${companyName}
Headquarters: ${hqCity}, ${hqState}
Total Employees: ${totalEmployees}

EMPLOYEE BREAKDOWN BY STATE:
${employeeStates.map(state => {
  const count = stateDistribution[state];
  const stateEmployees = employeesByState[state];
  return `
${state}: ${count} employee${count !== 1 ? 's' : ''}
${stateEmployees.map(e => `  - ${e.name} (${e.city}, ${state})`).join('\n')}`;
}).join('\n')}

COMPLIANCE SCENARIO:
Use this company information to evaluate compliance requirements. The company has employees in ${employeeStates.length} state${employeeStates.length !== 1 ? 's' : ''}: ${employeeStates.join(', ')}.`;

                if (setChatState && chatState) {
                  setChatState({ ...chatState, additionalContext: companyContext });
                }
              }}
            >
              <Building2 className="h-3.5 w-3.5" />
              Generate Test Company
            </button>
            
            <button
              type="button"
              className="text-xs px-2 py-1 border border-red-300 rounded hover:bg-red-50 text-red-600"
              onClick={() => {
                if (setChatState && chatState) {
                  setChatState({ ...chatState, additionalContext: '' })
                }
                if (updateChatSettings) {
                  updateChatSettings({
                    chatSystemPrompt: chatState?.systemPrompt,
                    chatModel: chatState?.model,
                    chatAdditionalContext: ''
                  })
                }
              }}
            >
              Clear
            </button>
          </div>
          
          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span><strong>Tip:</strong> Generate a test company, then ask questions like: &ldquo;Do we need sexual harassment training?&rdquo; or &ldquo;Which employees need training in California?&rdquo; The AI will use your saved research + company context to evaluate coverage.</span>
          </p>
        </div>
      </AccordionSection>

      <AccordionSection
        title="AI Settings"
        icon={Settings}
        isOpen={systemPromptOpen}
        onToggle={() => setSystemPromptOpen(!systemPromptOpen)}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Model</label>
            <select 
              className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-sm"
              value={chatState?.model || 'gemini-2.0-flash-exp'}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental) - Default</option>
              <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash Latest - Stable</option>
              <option value="gemini-1.5-flash-8b-latest">Gemini 1.5 Flash 8B - Lightweight</option>
              <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro Latest - Advanced</option>
              <option value="gemini-2.0-flash-thinking-exp-1219">Gemini 2.0 Flash Thinking - Extended Reasoning</option>
            </select>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-medium text-zinc-700">System Prompt</label>
                {isSavingPrompt && (
                  <span className="text-xs text-zinc-500">Saving...</span>
                )}
                {promptSaved && (
                  <span className="text-xs text-green-600">✓ Saved</span>
                )}
              </div>
              <button
                type="button"
                className="text-xs px-2 py-1 border border-purple-300 rounded hover:bg-purple-50 text-purple-700"
                onClick={handleResetPrompt}
              >
                Reset to Default
              </button>
            </div>
            <textarea
              rows={8}
              placeholder="You are RuleReady Compliance Chat AI..."
              className="w-full px-3 py-2 text-xs font-mono border border-zinc-200 rounded-md resize-y min-h-[120px] max-h-[400px]"
              value={chatState?.systemPrompt || ''}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Auto-saves as you type.
            </p>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Current Configuration"
        icon={Info}
        isOpen={configOpen}
        onToggle={() => setConfigOpen(!configOpen)}
      >
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-600">Jurisdiction:</span>
            <span className="font-medium text-zinc-900">{chatState?.jurisdiction || 'None (all jurisdictions)'}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-zinc-600 flex-shrink-0">Topic:</span>
            <span className="font-medium text-zinc-900 text-right">{chatState?.topic || 'None (all topics)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Saved Research:</span>
            <span className="font-medium text-zinc-900">
              {chatState?.selectedResearchIds && chatState.selectedResearchIds.length > 0
                ? `${chatState.selectedResearchIds.length} item(s) selected` 
                : 'None selected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Additional Context:</span>
            <span className="font-medium text-zinc-900">
              {chatState?.additionalContext && chatState.additionalContext.trim() 
                ? `${chatState.additionalContext.length} characters` 
                : 'None'}
            </span>
          </div>
          <div className="pt-2 border-t border-zinc-200">
            <span className="text-zinc-500 text-[10px]">Updates when you change filters above</span>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Final Prompt Preview"
        icon={Info}
        isOpen={promptPreviewOpen}
        onToggle={() => setPromptPreviewOpen(!promptPreviewOpen)}
      >
        <div className="space-y-2">
          <p className="text-xs text-zinc-600 mb-2">Shows what gets sent to the AI (simplified view)</p>
          {chatState?.lastPromptSent ? (
            <div className="p-3 bg-zinc-100 border border-zinc-200 rounded overflow-auto max-h-96 space-y-2 text-xs">
              {(() => {
                const prompt = chatState.lastPromptSent;
                const parts: React.ReactElement[] = [];
                
                // Extract the user's actual query
                const queryMatch = prompt.match(/User:\s*(.+?)(?=\n\nAssistant:|$)/);
                
                // Check for jurisdiction/topic in context
                const hasJurisdiction = chatState.jurisdiction && chatState.jurisdiction.trim();
                const hasTopic = chatState.topic && chatState.topic.trim();
                const hasContext = chatState.additionalContext && chatState.additionalContext.trim();
                
                // Show user query
                if (queryMatch) {
                  parts.push(
                    <div key="query" className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-bold text-sm text-purple-700">User Query:</span>
                      <span className="text-xs italic text-zinc-500">&ldquo;{queryMatch[1]?.trim()}&rdquo;</span>
                    </div>
                  );
                }
                
                // Show filters if applied
                if (hasJurisdiction || hasTopic) {
                  parts.push(
                    <div key="filters-header" className="font-bold text-sm text-purple-700 mt-2">
                      Active Filters:
                    </div>
                  );
                  
                  if (hasJurisdiction) {
                    parts.push(
                      <div key="jurisdiction" className="flex items-baseline gap-1 ml-2">
                        <span className="text-xs text-zinc-600">•</span>
                        <span className="font-bold text-xs text-purple-700">Jurisdiction:</span>
                        <span className="text-xs italic text-zinc-500">{chatState.jurisdiction}</span>
                      </div>
                    );
                  }
                  
                  if (hasTopic) {
                    parts.push(
                      <div key="topic" className="flex items-baseline gap-1 ml-2">
                        <span className="text-xs text-zinc-600">•</span>
                        <span className="font-bold text-xs text-purple-700">Topic:</span>
                        <span className="text-xs italic text-zinc-500">{chatState.topic}</span>
                      </div>
                    );
                  }
                }
                
                // Additional context summary
                if (hasContext) {
                  parts.push(
                    <div key="context" className="flex items-baseline gap-1 mt-2">
                      <span className="font-bold text-sm text-purple-700">Additional Context:</span>
                      <span className="text-xs italic text-zinc-500">{chatState.additionalContext?.length || 0} characters</span>
                    </div>
                  );
                }
                
                // Saved research info
                const hasResearch = chatState.selectedResearchIds && chatState.selectedResearchIds.length > 0;
                parts.push(
                  <div key="research" className="font-bold text-sm text-blue-700 mt-3">
                    Saved Research:
                  </div>
                );
                parts.push(
                  <div key="research-info" className="text-xs italic text-zinc-500 ml-2">
                    {hasResearch 
                      ? `Using ${chatState.selectedResearchIds?.length} saved research item(s) as knowledge base`
                      : 'No saved research selected - AI will ask you to provide it'}
                  </div>
                );
                
                // System instructions summary
                parts.push(
                  <div key="system-summary" className="font-bold text-sm text-blue-700 mt-3">
                    System Instructions: [View in AI Settings accordion above]
                  </div>
                );
                
                return <>{parts}</>;
              })()}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No chat query sent yet</p>
          )}
        </div>
      </AccordionSection>
    </div>
  )
}

