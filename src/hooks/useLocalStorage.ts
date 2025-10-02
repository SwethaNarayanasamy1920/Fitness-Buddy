/**
 * Custom hook for managing local storage with TypeScript support
 * Handles user data persistence for Fit Buddy
 */

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Fitness-specific data types
export interface UserProfile {
  id: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  equipment: string[];
  dietaryRestrictions: string[];
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  createdAt: string;
}

export interface WorkoutRecord {
  id: string;
  date: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    weight?: number;
    duration?: number;
  }>;
  totalDuration: number;
  caloriesBurned?: number;
  notes?: string;
}

export interface MealRecord {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: Array<{
    name: string;
    quantity: string;
    calories: number;
  }>;
  totalCalories: number;
  notes?: string;
}

export interface ProgressRecord {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
  photos?: string[];
  notes?: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  context?: 'workout' | 'diet' | 'motivation' | 'general';
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// Fitness-specific localStorage hooks
export const useUserProfile = () => {
  return useLocalStorage<UserProfile | null>('fitBuddy_userProfile', null);
};

export const useWorkoutHistory = () => {
  return useLocalStorage<WorkoutRecord[]>('fitBuddy_workoutHistory', []);
};

export const useMealHistory = () => {
  return useLocalStorage<MealRecord[]>('fitBuddy_mealHistory', []);
};

export const useProgressHistory = () => {
  return useLocalStorage<ProgressRecord[]>('fitBuddy_progressHistory', []);
};

export const useChatHistory = () => {
  return useLocalStorage<ChatMessage[]>('fitBuddy_chatHistory', []);
};