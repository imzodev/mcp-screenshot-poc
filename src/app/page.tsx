// src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import ThemeToggle from './components/ThemeToggle';

// Define types for chat messages
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  isScreenshot?: boolean;
  screenshotUrl?: string;
  screenshotBase64?: string;
}

export default function HomePage() {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input field when component loads
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Add a welcome message
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant. I can help you take screenshots of websites. Just ask me something like "Take a screenshot of example.com" or "Show me what the BBC website looks like right now", and I\'ll automatically capture and display the screenshot for you.',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId || null,
          message: userMessage.content,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to get response.');
      }

      // Save session ID if this is the first message
      if (!sessionId && result.sessionId) {
        setSessionId(result.sessionId);
      }

      // Add assistant response to chat
      setMessages(prev => [...prev, result.response]);

    } catch (err: any) {
      console.error("Chat API Error:", err);
      setError(err.message || 'An unexpected error occurred.');

      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      // Focus the input field again
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Handle pressing Enter to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render a chat message
  const renderMessage = (msg: ChatMessage, index: number) => {
    const isUser = msg.role === 'user';
    const hasScreenshot = msg.isScreenshot && msg.screenshotBase64;

    return (
      <div
        key={index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg p-4 ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
        >
          <div className="whitespace-pre-wrap">{msg.content}</div>

          {/* Render screenshot if available */}
          {hasScreenshot && (
            <div className="mt-2">
              <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                <img
                  src={`data:image/png;base64,${msg.screenshotBase64}`}
                  alt={`Screenshot of ${msg.screenshotUrl}`}
                  className="w-full h-auto"
                />
              </div>
              <a
                href={`data:image/png;base64,${msg.screenshotBase64}`}
                download={`screenshot-${msg.screenshotUrl ? new URL(msg.screenshotUrl).hostname : 'website'}.png`}
                className="inline-block mt-2 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition duration-150 ease-in-out"
              >
                Download Screenshot
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col h-screen max-h-screen">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">AI Screenshot Assistant</h1>
          <ThemeToggle />
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 dark:bg-gray-900">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, index) => renderMessage(msg, index))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mx-auto max-w-3xl mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-3xl mx-auto flex">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (e.g., 'Take a screenshot of github.com')"
              disabled={isLoading}
              rows={2}
              className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing
                </span>
              ) : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}