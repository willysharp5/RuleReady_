'use client'

import React, { useState } from 'react'
import { Settings, Info, Tag, Building2 } from 'lucide-react'
import { AccordionSection } from './AccordionSection'
import { JurisdictionSelect } from '@/components/ui/jurisdiction-select'
import { TopicSelect } from '@/components/ui/topic-select'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface ChatState {
  systemPrompt: string
  model?: string
  jurisdiction: string
  topic: string
  additionalContext?: string
  lastPromptSent?: string
}

interface ChatPropertiesProps {
  chatState?: ChatState
  setChatState?: (state: ChatState) => void
}

export function ChatProperties({ chatState, setChatState }: ChatPropertiesProps = {}) {
  // Query data
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const topicsQuery = useQuery(api.complianceQueries.getTopics)
  
  const jurisdictions = jurisdictionsQuery || []
  const topics = topicsQuery || []
  
  const selectedJurisdiction = jurisdictions.find(j => j.name === chatState?.jurisdiction) || null
  const selectedTopic = topics.find(t => t.name === chatState?.topic) || null
  
  const [systemPromptOpen, setSystemPromptOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false)
  
  const handleResetPrompt = () => {
    const defaultPrompt = `You are RuleReady Compliance Chat AI. Your role is to answer questions STRICTLY based on the compliance data in the internal database.

CRITICAL RULES:
1. ONLY use information that exists in the provided database sources
2. DO NOT use your general knowledge or training data
3. If the database has NO relevant information, say: "I don't have information about [topic] in the database" and STOP
4. DO NOT attempt to answer questions when database sources are missing or insufficient
5. DO NOT make assumptions or inferences beyond what the database explicitly states

WHEN DATABASE HAS INFORMATION:
- Cite which jurisdiction and topic the information comes from
- Distinguish between federal and state requirements
- Mention effective dates when relevant
- Note penalties or deadlines when applicable
- Be specific and detailed based on database content

WHEN DATABASE LACKS INFORMATION:
- Clearly state what information is missing
- Do NOT provide general compliance advice
- Do NOT suggest what "typically" or "usually" applies
- Simply acknowledge the limitation and stop

You are a database query tool, not a general compliance advisor.`
    
    if (setChatState && chatState) {
      setChatState({ ...chatState, systemPrompt: defaultPrompt })
    }
  }

  return (
    <div className="space-y-2">
      {/* How Chat Works - Always visible at top */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">How It Works</h5>
        <div className="text-xs text-blue-800 space-y-1.5">
          <div><strong>1. Your Input:</strong> Query + optional filters</div>
          <div><strong>2. Database Search:</strong> AI searches your compliance database</div>
          <div><strong>3. AI Response:</strong> AI analyzes and responds based on your data</div>
          <div><strong>4. Sources:</strong> Shows which database entries were used</div>
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
            Filter chat to specific jurisdiction or leave empty for all
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
            Filter chat to specific topic or leave empty for all
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
              onChange={(e) => {
                if (setChatState && chatState) {
                  setChatState({ ...chatState, additionalContext: e.target.value })
                }
              }}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Included in your next chat query. Cleared when you refresh the page.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs px-3 py-2 border border-purple-300 rounded hover:bg-purple-50 text-purple-700 flex-1 font-medium flex items-center justify-center gap-1.5"
              onClick={() => {
                const companyNames = ['TechCorp Solutions', 'Global Innovations Inc', 'Pacific Enterprises', 'Mountain View LLC', 'Coastal Industries', 'Midwest Manufacturing'];
                const states = ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Massachusetts', 'Washington', 'Colorado'];
                const cities: Record<string, string[]> = {
                  'California': ['San Francisco', 'Los Angeles', 'San Diego', 'Sacramento'],
                  'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany'],
                  'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio'],
                  'Florida': ['Miami', 'Tampa', 'Orlando', 'Jacksonville'],
                  'Illinois': ['Chicago', 'Springfield', 'Naperville'],
                  'Massachusetts': ['Boston', 'Cambridge', 'Worcester'],
                  'Washington': ['Seattle', 'Tacoma', 'Spokane'],
                  'Colorado': ['Denver', 'Boulder', 'Colorado Springs']
                };
                const firstNames = ['Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Maria', 'John', 'Jessica', 'William'];
                const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Chen', 'Patel'];
                
                const companyName = companyNames[Math.floor(Math.random() * companyNames.length)];
                const hqState = states[Math.floor(Math.random() * states.length)];
                const hqCity = cities[hqState][Math.floor(Math.random() * cities[hqState].length)];
                const totalEmployees = Math.floor(Math.random() * 200) + 10; // 10-210 employees
                
                // Generate employees across multiple states
                const numStates = Math.floor(Math.random() * 3) + 2; // 2-4 states
                const employeeStates = [hqState];
                while (employeeStates.length < numStates) {
                  const newState = states[Math.floor(Math.random() * states.length)];
                  if (!employeeStates.includes(newState)) {
                    employeeStates.push(newState);
                  }
                }
                
                const employees: Array<{name: string, state: string, city: string}> = [];
                let remainingEmployees = totalEmployees;
                
                employeeStates.forEach((state, idx) => {
                  const isLast = idx === employeeStates.length - 1;
                  const employeesInState = isLast 
                    ? remainingEmployees 
                    : Math.floor(Math.random() * (remainingEmployees - (employeeStates.length - idx - 1))) + 1;
                  
                  for (let i = 0; i < Math.min(5, employeesInState); i++) { // Show max 5 per state
                    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                    const city = cities[state][Math.floor(Math.random() * cities[state].length)];
                    employees.push({ name: `${firstName} ${lastName}`, state, city });
                  }
                  
                  remainingEmployees -= employeesInState;
                });
                
                const companyContext = `COMPANY PROFILE:

Company Name: ${companyName}
Headquarters: ${hqCity}, ${hqState}
Total Employees: ${totalEmployees}

EMPLOYEE BREAKDOWN BY STATE:
${employeeStates.map(state => {
  const count = Math.floor(totalEmployees / employeeStates.length);
  const stateEmployees = employees.filter(e => e.state === state);
  return `
${state}: ${count} employees
Sample Employees:
${stateEmployees.map(e => `  - ${e.name} (${e.city}, ${e.state})`).join('\n')}`;
}).join('\n')}

COMPLIANCE SCENARIO:
Use this company information to answer compliance questions. For example:
- "Do we need sexual harassment training in California?"
- "Which employees need to complete harassment training?"
- "What are our posting requirements for the New York office?"`;

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
              }}
            >
              Clear
            </button>
          </div>
          
          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span><strong>Tip:</strong> Generate a test company, then ask questions like: &ldquo;Do we need sexual harassment training?&rdquo; or &ldquo;Which employees need training in California?&rdquo; The AI will use your database to answer based on the company context.</span>
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
              onChange={(e) => {
                if (setChatState && chatState) {
                  setChatState({ ...chatState, model: e.target.value })
                }
              }}
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
              <label className="block text-xs font-medium text-zinc-700">System Prompt</label>
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
              onChange={(e) => {
                if (setChatState && chatState) {
                  setChatState({ ...chatState, systemPrompt: e.target.value })
                }
              }}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Customize how the AI responds to your questions
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
                
                // Database search info
                parts.push(
                  <div key="database" className="font-bold text-sm text-blue-700 mt-3">
                    Database Search:
                  </div>
                );
                parts.push(
                  <div key="db-info" className="text-xs italic text-zinc-500 ml-2">
                    AI searches your internal compliance database with the filters above
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

