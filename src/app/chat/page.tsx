'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  FileText, 
  MapPin, 
  Scale, 
  Bot,
  User,
  Loader2,
  Sparkles
} from 'lucide-react';

type ChatSource = {
  id: number;
  similarity: number;
  url?: string;
  jurisdiction?: string;
  topicKey?: string;
  topicLabel?: string;
};

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; title?: string; sources?: ChatSource[] };

export default function ComplianceChatPage() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<ChatMessage>>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm your RuleReady compliance assistant. I can help you understand employment law requirements across all US jurisdictions using data from 1,175 compliance reports. Ask me about minimum wage, harassment training, leave policies, or any other compliance topic.",
    },
  ]);
  
  // Get compliance data for context
  const jurisdictions = useQuery(api.complianceQueries.getJurisdictions);
  const topics = useQuery(api.complianceQueries.getTopics);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const userMessage: ChatMessage = { id: String(Date.now()), role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/compliance-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          jurisdiction: selectedJurisdiction,
          topic: selectedTopic,
        }),
      });
      const data = await res.json();
      const assistantMessage: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: data.content || 'Sorry, I could not generate a response.',
        title: data.title,
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: String(Date.now() + 2),
        role: 'assistant',
        content: 'There was an error contacting the compliance assistant.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "What are the minimum wage requirements in California?",
    "What harassment training is required for supervisors?",
    "What are the posting requirements for Texas employers?",
    "How does paid sick leave work in New York?",
    "What are the workers compensation requirements?",
    "What background check rules apply to hiring?",
    "What are the overtime pay requirements?",
    "What posting requirements do I need to follow?",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                </div>
                Compliance Chat Assistant
              </h1>
              <p className="text-gray-600 mt-2">
                AI-powered compliance guidance using data from 1,175 compliance reports across all US jurisdictions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by Gemini 2.0 Flash
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[700px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Compliance Conversation
                  {(selectedJurisdiction || selectedTopic) && (
                    <div className="flex items-center gap-2 ml-auto">
                      {selectedJurisdiction && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {selectedJurisdiction}
                        </Badge>
                      )}
                      {selectedTopic && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {topics?.find(t => t.topicKey === selectedTopic)?.name || selectedTopic}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`p-2 rounded-full ${message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          {message.role === 'user' ? (
                            <User className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Bot className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                        <div
                          className={`p-4 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <div className="prose prose-lg md:prose-xl max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-headings:mt-6 prose-headings:mb-4 prose-p:my-4 prose-ul:my-4 prose-li:my-2 prose-strong:font-semibold">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                          )}
                          {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                              <div className="text-xs font-medium text-gray-600 mb-2">Sources (embedding matches)</div>
                              <ul className="space-y-1">
                                {message.sources.map((s) => (
                                  <li key={s.id} className="text-xs text-gray-700">
                                    <span className="font-mono mr-1">[{s.id}]</span>
                                    {s.jurisdiction && <span className="mr-1">{s.jurisdiction}:</span>}
                                    {s.topicLabel && <span className="mr-1">{s.topicLabel}</span>}
                                    <span className="text-gray-500 mr-2">({Math.round((s.similarity || 0) * 100)}%)</span>
                                    {s.url ? (
                                      <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Link</a>
                                    ) : (
                                      <span className="text-gray-400">No URL</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-2">
                        <div className="p-2 rounded-full bg-gray-100">
                          <Bot className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="bg-white border border-gray-200 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-600">Analyzing compliance data...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about compliance requirements..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Context Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Focus Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Jurisdiction</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded text-xs"
                    value={selectedJurisdiction}
                    onChange={(e) => setSelectedJurisdiction(e.target.value)}
                  >
                    <option value="">All Jurisdictions</option>
                    {jurisdictions?.slice(0, 10).map(j => (
                      <option key={j.code} value={j.name}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Topic</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded text-xs"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                  >
                    <option value="">All Topics</option>
                    {topics?.slice(0, 10).map(t => (
                      <option key={t.topicKey} value={t.topicKey}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-gray-500">
                  Select jurisdiction and topic to focus the AI&apos;s responses on specific compliance areas.
                </div>
              </CardContent>
            </Card>

            {/* Quick Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickQuestions.map((question, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start h-auto p-2 text-xs"
                    onClick={() => setInput(question)}
                    disabled={isLoading}
                  >
                    {question}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Data Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Data Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-blue-600" />
                    <span>1,175 Compliance Reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-green-600" />
                    <span>52 Jurisdictions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scale className="h-3 w-3 text-purple-600" />
                    <span>25 Topic Categories</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-orange-600" />
                    <span>2,759 AI Embeddings</span>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-blue-50 rounded border text-xs">
                  <p className="font-medium text-blue-900 mb-1">Template Structure:</p>
                  <p className="text-blue-800">
                    Each compliance area is analyzed using a 16-section template including 
                    overview, covered employers, training requirements, penalties, and sources.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Model Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">AI Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3 text-blue-600" />
                    <span className="font-medium">Gemini 2.0 Flash</span>
                  </div>
                  <div className="text-gray-600">
                    Fast, accurate responses optimized for compliance analysis with low temperature (0.1) for consistent results.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
