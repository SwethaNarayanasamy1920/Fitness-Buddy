import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { message, userId, context = 'general' } = await req.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Message and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing message from user ${userId}: ${message}`);

    // Fetch user profile for personalization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    console.log('User profile:', profile);

    // Build system prompt based on context and user profile
    const systemPrompt = buildSystemPrompt(context, profile);
    
    // Get recent chat history for context
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('message, is_user')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = (recentMessages || [])
      .reverse()
      .map(msg => ({
        role: msg.is_user ? 'user' : 'assistant',
        content: msg.message
      }));

    // Prepare messages for Gemini
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log('Sending request to Gemini with messages:', messages.length);

    // Convert messages to Gemini format
    const geminiMessages = messages.slice(1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                      "I'm sorry, I couldn't generate a response right now. Please try again.";

    console.log('Gemini response:', aiResponse);

    return new Response(
      JSON.stringify({ 
        message: aiResponse,
        context: context,
        hasProfile: !!profile
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in fitness-ai-chat function:', error);
    
    // Return a fallback response
    const fallbackMessage = getFallbackResponse(context);
    
    return new Response(
      JSON.stringify({ 
        message: fallbackMessage,
        error: 'AI service temporarily unavailable'
      }),
      {
        status: 200, // Return 200 so the frontend gets a response
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function buildSystemPrompt(context: string, profile: any): string {
  let basePrompt = `You are a highly experienced and motivational personal fitness coach named Coach Alex. You are NOT an AI assistant - you are a real fitness expert who has helped thousands of people achieve their fitness goals.

IMPORTANT COACHING PERSONALITY:
- Speak like a professional personal trainer, not an AI
- Be encouraging, motivational, and supportive but also challenging when needed
- Use fitness industry terminology naturally
- Share specific, actionable advice based on real training experience
- Always be positive and build confidence
- Ask follow-up questions to understand their needs better
- Provide detailed workout plans with specific exercises, sets, reps, and form cues
- Give comprehensive nutrition advice with meal plans and macro breakdowns
- Celebrate their progress and milestones
- Be their accountability partner and cheerleader

NEVER mention being an AI, Gemini, or any artificial intelligence. You are Coach Alex, a real human fitness expert.`;

  if (profile) {
    basePrompt += `\n\nUSER PROFILE:
- Name: ${profile.name || 'User'}
- Age: ${profile.age || 'Not specified'}
- Weight: ${profile.weight || 'Not specified'} ${profile.weight ? 'lbs' : ''}
- Height: ${profile.height || 'Not specified'} ${profile.height ? 'inches' : ''}
- Gender: ${profile.gender || 'Not specified'}
- Fitness Level: ${profile.fitness_level || 'Not specified'}
- Activity Level: ${profile.activity_level || 'Not specified'}
- Goals: ${profile.goals?.join(', ') || 'Not specified'}
- Available Equipment: ${profile.equipment?.join(', ') || 'Not specified'}
- Dietary Restrictions: ${profile.dietary_restrictions?.join(', ') || 'None specified'}

Use this profile information to personalize ALL your responses.`;
  }

  const contextPrompts = {
    workout: `\n\nCONTEXT: The user is asking about WORKOUTS and EXERCISES.
Focus on:
- Detailed exercise routines with specific sets, reps, and rest periods
- Proper form instructions and safety tips
- Progressive overload strategies
- Recovery and rest day recommendations
- Equipment alternatives if needed`,

    diet: `\n\nCONTEXT: The user is asking about NUTRITION and DIET.
Focus on:
- Detailed meal plans with specific foods and portions
- Calorie and macro calculations
- Hydration recommendations
- Meal timing and frequency
- Healthy recipe suggestions and substitutions`,

    motivation: `\n\nCONTEXT: The user needs MOTIVATION and ENCOURAGEMENT.
Focus on:
- Positive reinforcement and encouragement
- Goal-setting strategies
- Overcoming common fitness obstacles
- Building sustainable habits
- Celebrating progress and milestones`,

    general: `\n\nCONTEXT: General fitness consultation.
Be ready to address any fitness-related topic comprehensively.`
  };

  return basePrompt + (contextPrompts[context as keyof typeof contextPrompts] || contextPrompts.general);
}

function getFallbackResponse(context: string): string {
  const fallbacks = {
    workout: "I'm having trouble accessing my full capabilities right now, but I can still help! For a quick workout, try: 3 sets of 10 push-ups, 3 sets of 15 squats, and a 30-second plank. Focus on proper form and controlled movements. What specific exercises are you interested in?",
    diet: "I'm experiencing some technical difficulties, but here's a quick nutrition tip: Focus on eating a balanced plate with 1/2 vegetables, 1/4 lean protein, and 1/4 complex carbohydrates. Drink plenty of water throughout the day. What are your specific nutrition goals?",
    motivation: "Even though I'm having some technical issues, remember this: every workout, no matter how small, is progress! You're investing in your health and future self. What's one small healthy choice you can make today?",
    general: "I'm experiencing some connectivity issues, but I'm still here to help with your fitness journey! Whether you need workout advice, nutrition tips, or motivation, I'm ready to assist. What would you like to focus on today?"
  };
  
  return fallbacks[context as keyof typeof fallbacks] || fallbacks.general;
}