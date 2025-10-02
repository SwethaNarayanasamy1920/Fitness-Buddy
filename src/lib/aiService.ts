/**
 * AI Service for Fit Buddy - Handles client-side NLP processing
 * Uses Hugging Face Transformers for sentiment analysis and text generation
 */

import { pipeline } from '@huggingface/transformers';

// AI Models for different tasks
let sentimentModel: any = null;
let textModel: any = null;

/**
 * Initialize AI models (lazy loading)
 */
export const initializeAI = async () => {
  try {
    // Initialize sentiment analysis model
    if (!sentimentModel) {
      sentimentModel = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    }
    
    // Initialize text generation model (lightweight)
    if (!textModel) {
      textModel = await pipeline('text-generation', 'Xenova/gpt2');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing AI models:', error);
    return false;
  }
};

/**
 * Analyze sentiment of user message
 * Returns: positive, negative, or neutral
 */
export const analyzeSentiment = async (text: string): Promise<'positive' | 'negative' | 'neutral'> => {
  try {
    if (!sentimentModel) {
      await initializeAI();
    }
    
    const result = await sentimentModel(text);
    const sentiment = result[0];
    
    if (sentiment.label === 'POSITIVE' && sentiment.score > 0.7) {
      return 'positive';
    } else if (sentiment.label === 'NEGATIVE' && sentiment.score > 0.7) {
      return 'negative';
    } else {
      return 'neutral';
    }
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return 'neutral';
  }
};

/**
 * Generate AI response based on user query and context
 */
export const generateAIResponse = async (
  userMessage: string, 
  context: 'workout' | 'diet' | 'motivation' | 'general' = 'general',
  userProfile?: any
): Promise<string> => {
  const sentiment = await analyzeSentiment(userMessage);
  
  // Context-aware response templates
  const responses = {
    workout: {
      positive: [
        "That's fantastic energy! Let's channel that into an amazing workout. Based on your goals, I recommend starting with compound movements like squats and deadlifts.",
        "I love your enthusiasm! For a great full-body workout, try this circuit: 20 push-ups, 30-second plank, 15 burpees, rest 1 minute, repeat 3 times.",
        "Your motivation is inspiring! Let's build on that with progressive overload. Start with bodyweight exercises and gradually add resistance."
      ],
      negative: [
        "I understand you might be feeling challenged right now. That's completely normal! Let's start small with a 10-minute gentle yoga session or a short walk.",
        "Every fitness journey has ups and downs. You're stronger than you think! How about we try some light stretching or breathing exercises today?",
        "It's okay to have tough days. Remember, consistency matters more than intensity. Even 5 minutes of movement is better than none!"
      ],
      neutral: [
        "Let's create a balanced workout plan for you! What's your current fitness level and what equipment do you have access to?",
        "I'm here to help you reach your fitness goals. Would you prefer cardio, strength training, or a combination of both today?",
        "Great question! For optimal results, aim for 150 minutes of moderate exercise per week. Let's break that down into manageable sessions."
      ]
    },
    diet: {
      positive: [
        "Your commitment to healthy eating is amazing! Focus on whole foods: lean proteins, complex carbs, healthy fats, and plenty of vegetables.",
        "Excellent mindset! Nutrition is 70% of your fitness journey. Let's calculate your daily calorie needs and macro distribution.",
        "I'm excited to help you optimize your nutrition! Remember: eat the rainbow, stay hydrated, and listen to your body's hunger cues."
      ],
      negative: [
        "Nutrition can feel overwhelming, but small changes make a big difference. Start with adding one extra serving of vegetables to each meal.",
        "Don't be hard on yourself about food choices. Progress isn't perfection. Let's focus on building sustainable, healthy habits gradually.",
        "Everyone struggles with nutrition sometimes. The key is consistency over perfection. What's one small healthy change you could make today?"
      ],
      neutral: [
        "Let me help you create a personalized nutrition plan. What are your dietary preferences and any restrictions I should know about?",
        "Good nutrition supports your fitness goals. Are you looking to lose weight, gain muscle, or maintain your current weight?",
        "Balanced nutrition includes proteins, carbohydrates, and healthy fats. What's your typical daily eating pattern like?"
      ]
    },
    motivation: {
      positive: [
        "Your positive attitude is your superpower! Remember: you're building not just a stronger body, but a stronger mind and spirit.",
        "That energy is contagious! Every workout, every healthy meal is an investment in the best version of yourself.",
        "I can feel your determination! Champions are made through consistency, and you're already showing championship mindset."
      ],
      negative: [
        "I hear you, and it's okay to feel this way. Remember why you started this journey. Every small step forward is still progress.",
        "Tough times don't last, but tough people do. You've overcome challenges before, and you'll overcome this too. I believe in you!",
        "It's normal to have difficult days. What matters is that you don't give up. Even champions have bad days - what makes them champions is getting back up."
      ],
      neutral: [
        "Consistency beats perfection every time. Focus on showing up for yourself, even when you don't feel like it.",
        "Your fitness journey is unique to you. Celebrate small wins and trust the process. Progress isn't always visible immediately.",
        "Remember: you're stronger than you were yesterday, and that's what matters. Keep pushing forward, one day at a time."
      ]
    },
    general: {
      positive: [
        "I love your enthusiasm! I'm here to support your fitness journey in any way I can. What aspect of fitness interests you most today?",
        "Your positive energy is wonderful! Whether it's workout tips, nutrition advice, or motivation, I'm here to help you succeed.",
        "That's the spirit! Fitness is a journey of continuous improvement. What goals are you working towards?"
      ],
      negative: [
        "I'm here to support you through any challenges. Remember, every expert was once a beginner. What's one small step we can take together today?",
        "It's okay to feel overwhelmed sometimes. Let's break your fitness goals into smaller, manageable steps. What would feel achievable for you right now?",
        "Your feelings are valid, and seeking help shows strength. I'm here to guide you. What aspect of fitness feels most challenging right now?"
      ],
      neutral: [
        "Hello! I'm your AI fitness companion. I can help with workout plans, nutrition advice, progress tracking, and motivation. What would you like to work on today?",
        "I'm here to support your fitness journey! Whether you need exercise guidance, meal planning, or just some encouragement, I've got you covered.",
        "Welcome to your personal fitness assistant! I can provide customized workout recommendations, nutrition tips, and track your progress. How can I help you today?"
      ]
    }
  };

  // Select appropriate response based on context and sentiment
  const contextResponses = responses[context] || responses.general;
  const sentimentResponses = contextResponses[sentiment];
  const randomResponse = sentimentResponses[Math.floor(Math.random() * sentimentResponses.length)];

  return randomResponse;
};

/**
 * Generate personalized workout recommendation
 */
export const generateWorkoutPlan = (userProfile: any) => {
  const { fitnessLevel, goals, equipment, timeAvailable, preferredExercises } = userProfile;
  
  const workoutPlans = {
    beginner: {
      strength: {
        exercises: [
          { name: "Bodyweight Squats", sets: 3, reps: "8-12", rest: "60s" },
          { name: "Modified Push-ups", sets: 3, reps: "5-10", rest: "60s" },
          { name: "Plank Hold", sets: 3, reps: "15-30s", rest: "45s" },
          { name: "Glute Bridges", sets: 3, reps: "10-15", rest: "45s" },
          { name: "Wall Sits", sets: 2, reps: "15-30s", rest: "60s" }
        ],
        duration: "20-25 minutes"
      },
      cardio: {
        exercises: [
          { name: "Brisk Walking", sets: 1, reps: "15-20 min", rest: "N/A" },
          { name: "Marching in Place", sets: 3, reps: "1 min", rest: "30s" },
          { name: "Step-ups (using stairs)", sets: 3, reps: "30s", rest: "30s" },
          { name: "Arm Circles", sets: 2, reps: "30s each direction", rest: "15s" }
        ],
        duration: "15-20 minutes"
      }
    },
    intermediate: {
      strength: {
        exercises: [
          { name: "Goblet Squats", sets: 4, reps: "12-15", rest: "90s" },
          { name: "Push-ups", sets: 3, reps: "10-15", rest: "60s" },
          { name: "Dumbbell Rows", sets: 3, reps: "12-15 each arm", rest: "60s" },
          { name: "Lunges", sets: 3, reps: "10 each leg", rest: "60s" },
          { name: "Plank to Downward Dog", sets: 3, reps: "8-10", rest: "45s" }
        ],
        duration: "30-35 minutes"
      },
      cardio: {
        exercises: [
          { name: "Jump Rope", sets: 4, reps: "45s", rest: "15s" },
          { name: "High Knees", sets: 3, reps: "30s", rest: "30s" },
          { name: "Burpees", sets: 3, reps: "5-8", rest: "60s" },
          { name: "Mountain Climbers", sets: 3, reps: "30s", rest: "30s" }
        ],
        duration: "25-30 minutes"
      }
    },
    advanced: {
      strength: {
        exercises: [
          { name: "Barbell Squats", sets: 4, reps: "8-12", rest: "2-3min" },
          { name: "Deadlifts", sets: 4, reps: "6-10", rest: "2-3min" },
          { name: "Pull-ups/Chin-ups", sets: 3, reps: "8-12", rest: "90s" },
          { name: "Overhead Press", sets: 3, reps: "8-12", rest: "90s" },
          { name: "Weighted Lunges", sets: 3, reps: "10-12 each leg", rest: "90s" }
        ],
        duration: "45-60 minutes"
      },
      cardio: {
        exercises: [
          { name: "HIIT Sprints", sets: 6, reps: "30s sprint, 90s walk", rest: "N/A" },
          { name: "Box Jumps", sets: 4, reps: "8-10", rest: "90s" },
          { name: "Kettlebell Swings", sets: 4, reps: "20-25", rest: "60s" },
          { name: "Battle Ropes", sets: 3, reps: "30s", rest: "90s" }
        ],
        duration: "25-35 minutes"
      }
    }
  };

  const level = fitnessLevel || 'beginner';
  const goal = goals?.includes('weight_loss') ? 'cardio' : 'strength';
  
  return workoutPlans[level]?.[goal] || workoutPlans.beginner.strength;
};

/**
 * Generate personalized diet recommendation
 */
export const generateDietPlan = (userProfile: any) => {
  const { age, weight, height, goals, dietaryRestrictions, activityLevel } = userProfile;
  
  // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
  const calculateBMR = (weight: number, height: number, age: number, gender: 'male' | 'female') => {
    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  };

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const bmr = calculateBMR(weight, height, age, userProfile.gender || 'male');
  const dailyCalories = Math.round(bmr * (activityMultipliers[activityLevel] || 1.375));

  // Adjust calories based on goals
  let targetCalories = dailyCalories;
  if (goals?.includes('weight_loss')) {
    targetCalories = Math.round(dailyCalories * 0.8); // 20% deficit
  } else if (goals?.includes('muscle_gain')) {
    targetCalories = Math.round(dailyCalories * 1.1); // 10% surplus
  }

  // Macro distribution
  const protein = Math.round((targetCalories * 0.3) / 4); // 30% protein
  const carbs = Math.round((targetCalories * 0.4) / 4); // 40% carbs
  const fats = Math.round((targetCalories * 0.3) / 9); // 30% fats

  const mealPlan = {
    breakfast: [
      "2 eggs scrambled with spinach",
      "1 slice whole grain toast",
      "1/2 avocado",
      "1 cup berries"
    ],
    lunch: [
      "Grilled chicken breast (4oz)",
      "Quinoa salad with vegetables",
      "Mixed greens with olive oil dressing",
      "1 apple"
    ],
    dinner: [
      "Baked salmon (4oz)",
      "Roasted sweet potato",
      "Steamed broccoli",
      "Small side salad"
    ],
    snacks: [
      "Greek yogurt with nuts",
      "Protein smoothie",
      "Hummus with vegetables"
    ]
  };

  return {
    targetCalories,
    macros: { protein, carbs, fats },
    mealPlan,
    tips: [
      "Drink at least 8 glasses of water daily",
      "Eat every 3-4 hours to maintain energy",
      "Include protein in every meal",
      "Choose complex carbohydrates over simple sugars",
      "Don't skip meals, especially breakfast"
    ]
  };
};