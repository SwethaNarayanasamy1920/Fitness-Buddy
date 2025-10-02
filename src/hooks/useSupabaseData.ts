import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

export function useUserProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  return { profile, loading };
}

export function useChatMessages(userId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
        } else {
          setMessages(data || []);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [userId]);

  const addMessage = async (message: Omit<ChatMessage, 'id' | 'created_at' | 'user_id'>) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          ...message,
          user_id: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding message:', error);
      } else {
        setMessages(prev => [...prev, data]);
      }

      return data;
    } catch (error) {
      console.error('Error adding message:', error);
    }
  };

  const clearMessages = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing messages:', error);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  };

  return { messages, loading, addMessage, clearMessages };
}