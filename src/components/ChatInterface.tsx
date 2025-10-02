/**
 * Chat Interface Component for Fit Buddy
 * Handles AI conversation with fitness context using Supabase and OpenAI
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Heart, Dumbbell, Apple, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChatMessages, useUserProfile } from '@/hooks/useSupabaseData';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '' }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useSupabaseAuth();
  const { messages: chatHistory, addMessage, clearMessages } = useChatMessages(user?.id);
  const { profile } = useUserProfile(user?.id);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Determine message context based on keywords
  const detectContext = (message: string): 'workout' | 'diet' | 'motivation' | 'general' => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('workout') || lowerMessage.includes('exercise') || lowerMessage.includes('train')) {
      return 'workout';
    }
    if (lowerMessage.includes('diet') || lowerMessage.includes('food') || lowerMessage.includes('eat')) {
      return 'diet';
    }
    if (lowerMessage.includes('motivat') || lowerMessage.includes('encourage') || lowerMessage.includes('inspire')) {
      return 'motivation';
    }
    return 'general';
  };

  const sendMessage = async () => {
    if (!message.trim() || !user) return;

    const userMessageText = message.trim();
    const context = detectContext(userMessageText);
    
    setMessage('');
    setIsLoading(true);

    try {
      // Add user message to database
      await addMessage({
        message: userMessageText,
        is_user: true,
        context: context,
        sentiment: null
      });

      // Call AI edge function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('fitness-ai-chat', {
        body: {
          message: userMessageText,
          userId: user.id,
          context: context
        }
      });

      if (aiError) {
        console.error('AI function error:', aiError);
        throw new Error(aiError.message);
      }

      // Add AI response to database
      await addMessage({
        message: aiData.message,
        is_user: false,
        context: aiData.context || context,
        sentiment: 'neutral' // We could enhance this with sentiment analysis later
      });

    } catch (error) {
      console.error('Error in chat:', error);
      
      // Add error message to chat
      await addMessage({
        message: "I'm having trouble right now. Let me help you with some general fitness advice! What would you like to focus on today?",
        is_user: false,
        context: 'general',
        sentiment: null
      });
      
      toast({
        title: "Response Error",
        description: "There was an issue generating a response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getContextIcon = (context?: string | null) => {
    switch (context) {
      case 'workout': return <Dumbbell className="w-4 h-4" />;
      case 'diet': return <Apple className="w-4 h-4" />;
      case 'motivation': return <Heart className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getSentimentColor = (sentiment?: string | null) => {
    switch (sentiment) {
      case 'positive': return 'bg-accent text-accent-foreground';
      case 'negative': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleClearChat = async () => {
    await clearMessages();
    toast({
      title: "Chat Cleared",
      description: "Your conversation history has been cleared.",
    });
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="flex-shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Fit Buddy AI Coach
            {profile && (
              <Badge variant="outline" className="ml-2 text-xs">
                {profile.name}
              </Badge>
            )}
          </CardTitle>
          {chatHistory.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearChat}>
              Clear Chat
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 p-0 px-6">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-2 mb-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  Welcome to Fit Buddy, {profile?.name || 'Fitness Enthusiast'}!
                </h3>
                <p className="text-muted-foreground text-sm">
                  I'm your personalized AI fitness coach. I have access to your profile and can provide detailed, customized workout plans, nutrition advice, and motivation. Ask me anything!
                </p>
                {!profile && (
                  <p className="text-orange-600 text-sm mt-2">
                    Complete your profile setup to get more personalized recommendations!
                  </p>
                )}
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.is_user ? 'justify-end' : 'justify-start'}`}
                >
                  {!msg.is_user && (
                    <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${msg.is_user ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {msg.context && (
                        <Badge variant="outline" className="text-xs">
                          {getContextIcon(msg.context)}
                          <span className="ml-1 capitalize">{msg.context}</span>
                        </Badge>
                      )}
                      {msg.sentiment && !msg.is_user && (
                        <Badge className={`text-xs ${getSentimentColor(msg.sentiment)}`}>
                          {msg.sentiment}
                        </Badge>
                      )}
                    </div>
                    
                    <div
                      className={`p-3 rounded-lg ${
                        msg.is_user
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.message}
                      </p>
                      <p className="text-xs opacity-70 mt-2">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {msg.is_user && (
                    <div className="flex-shrink-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-accent-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2 pb-6">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask me about ${profile ? 'your personalized' : ''} workouts, nutrition, or fitness goals...`}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !message.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};