/**
 * Conversational Onboarding Component for Fit Buddy
 * Guides users through profile setup with AI-driven conversation
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, Bot, User, CheckCircle, Loader2, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

interface OnboardingStep {
  id: string;
  field: keyof ProfileInsert;
  question: string;
  type: 'input' | 'number' | 'select' | 'multiselect' | 'height_weight';
  options?: { value: string; label: string }[];
  validation?: (value: any) => boolean;
  completed: boolean;
}

interface ConversationalOnboardingProps {
  onComplete?: () => void;
}

export const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({ onComplete }) => {
  const { user } = useSupabaseAuth();
  const [currentStep, setCurrentStep] = useState<'greeting' | 'structured'>('greeting');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<Partial<ProfileInsert>>({});
  const [messages, setMessages] = useState<Array<{id: string, text: string, isBot: boolean, timestamp: Date}>>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const structuredSteps: OnboardingStep[] = [
    {
      id: 'height_weight',
      field: 'height',
      question: "What's your current weight and height? This helps me calculate your Body Mass Index (BMI) and understand your starting point.",
      type: 'height_weight',
      completed: false,
      validation: (value) => value.height && value.weight
    },
    {
      id: 'activity_level',
      field: 'activity_level',
      question: "What's your current activity level?",
      type: 'select',
      options: [
        { value: 'sedentary', label: 'Sedentary' },
        { value: 'lightly_active', label: 'Lightly Active' },
        { value: 'moderately_active', label: 'Moderately Active' },
        { value: 'very_active', label: 'Very Active' }
      ],
      completed: false,
      validation: (value) => ['sedentary', 'lightly_active', 'moderately_active', 'very_active'].includes(value)
    },
    {
      id: 'daily_diet',
      field: 'name', // Using name field to store daily diet info temporarily 
      question: "What's your typical daily diet like? Knowing your current eating habits helps me suggest appropriate dietary adjustments.",
      type: 'input',
      completed: false,
      validation: (value) => value && value.length > 10
    },
    {
      id: 'equipment',
      field: 'equipment',
      question: "What kind of exercise equipment do you have access to?",
      type: 'multiselect',
      options: [
        { value: 'gym_membership', label: 'Gym Membership' },
        { value: 'home_gym', label: 'Home Gym' },
        { value: 'bodyweight_only', label: 'Bodyweight Only' },
        { value: 'dumbbells', label: 'Dumbbells' },
        { value: 'resistance_bands', label: 'Resistance Bands' },
        { value: 'cardio_machine', label: 'Cardio Machines' }
      ],
      completed: false,
      validation: (value) => Array.isArray(value) && value.length > 0
    },
    {
      id: 'dietary_restrictions',
      field: 'dietary_restrictions',
      question: "Do you have any dietary restrictions or allergies?",
      type: 'multiselect',
      options: [
        { value: 'none', label: 'No Restrictions' },
        { value: 'vegetarian', label: 'Vegetarian' },
        { value: 'vegan', label: 'Vegan' },
        { value: 'gluten_free', label: 'Gluten Free' },
        { value: 'dairy_free', label: 'Dairy Free' },
        { value: 'nut_allergy', label: 'Nut Allergy' },
        { value: 'shellfish_allergy', label: 'Shellfish Allergy' },
        { value: 'other', label: 'Other' }
      ],
      completed: false,
      validation: (value) => Array.isArray(value) && value.length > 0
    }
  ];

  const [steps, setSteps] = useState(structuredSteps);
  const currentStructuredStep = steps[currentStepIndex];

  // Initialize with greeting prompt
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        text: "Hey there! I'm Coach Alex 👋 Excited to help you get fitter and stronger. To get started, I'll need a couple of basics. Just say hello, hi, or hey to begin!",
        isBot: true,
        timestamp: new Date()
      }]);
    }
  }, []);

  // Detect greetings and trigger height/weight form
  const detectGreeting = (message: string): boolean => {
    const greetings = ['hello', 'hi', 'hey', 'hola', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => message.toLowerCase().includes(greeting));
  };

  const handleGreeting = () => {
    addMessage("Perfect! Thanks for saying hello 🙌 Now I need to collect some information to create your personalized fitness plan.", true);
    setCurrentStep('structured');
    
    setTimeout(() => {
      addMessage(steps[0].question, true);
    }, 500);
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (text: string, isBot: boolean) => {
    const newMessage = {
      id: Date.now().toString(),
      text,
      isBot,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };


  const handleUserMessage = (message: string) => {
    if (currentStep === 'greeting' && detectGreeting(message)) {
      addMessage(message, false);
      handleGreeting();
    } else if (currentStep === 'greeting') {
      addMessage(message, false);
      addMessage("Please say hello, hi, or hey to get started with your fitness journey! 😊", true);
    }
  };

  const handleStructuredStepComplete = async (value: any) => {
    // Add user response
    let displayValue = value;
    if (Array.isArray(value)) {
      const labels = value.map(v => currentStructuredStep.options?.find(opt => opt.value === v)?.label || v);
      displayValue = labels.join(', ');
    } else if (currentStructuredStep.options) {
      displayValue = currentStructuredStep.options.find(opt => opt.value === value)?.label || value;
    }

    addMessage(displayValue.toString(), false);

    // Update profile data
    setProfileData(prev => ({
      ...prev,
      [currentStructuredStep.field]: value
    }));

    // Mark step as completed
    setSteps(prev => prev.map((step, index) => 
      index === currentStepIndex ? { ...step, completed: true } : step
    ));

    setIsLoading(true);

    // Move to next step or complete
    if (currentStepIndex < steps.length - 1) {
      setTimeout(() => {
        const nextStep = steps[currentStepIndex + 1];
        addMessage(nextStep.question, true);
        setCurrentStepIndex(prev => prev + 1);
        setIsLoading(false);
      }, 1000);
    } else {
      // Complete onboarding
      setTimeout(() => {
        completeOnboarding();
      }, 1000);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      const finalProfileData: ProfileInsert = {
        ...profileData as ProfileInsert,
        user_id: user.id
      };

      const { error } = await supabase
        .from('profiles')
        .insert(finalProfileData);

      if (error) throw error;

      addMessage("Awesome, I've got everything I need to build your personalized workout and meal plan! 🚀 Ready to begin?", true);
      
      toast({
        title: "Profile Created!",
        description: "Your personalized fitness profile is ready. Welcome to Fit Buddy!",
      });

      setTimeout(() => {
        onComplete?.();
      }, 2000);

    } catch (error) {
      console.error('Error saving profile:', error);
      addMessage("I encountered an issue saving your profile. Let me try that again.", true);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = () => {
    if (currentStep === 'greeting') {
      return (
        <InputField
          onSubmit={handleUserMessage}
          placeholder="Say hello to get started..."
          disabled={isLoading}
        />
      );
    }


    if (currentStep === 'structured') {
      if (currentStepIndex >= steps.length || currentStructuredStep?.completed) {
        return null;
      }

      switch (currentStructuredStep.type) {
        case 'height_weight':
          return (
            <HeightWeightBox
              onSubmit={(data) => handleStructuredStepComplete(data)}
              disabled={isLoading}
            />
          );

        case 'input':
          return (
            <InputBox
              onSubmit={(value) => handleStructuredStepComplete(value)}
              placeholder="Tell me about your typical meals..."
              disabled={isLoading}
            />
          );
        
        case 'select':
          return (
            <SelectBox
              options={currentStructuredStep.options || []}
              onSelect={(value) => handleStructuredStepComplete(value)}
              disabled={isLoading}
            />
          );
        
        case 'multiselect':
          return (
            <MultiSelectBox
              options={currentStructuredStep.options || []}
              onSubmit={(values) => handleStructuredStepComplete(values)}
              disabled={isLoading}
            />
          );
        
        default:
          return null;
      }
    }

    return null;
  };

  const calculateProgress = () => {
    const totalSteps = steps.length;
    const completedSteps = steps.filter(step => step.completed).length;
    
    return Math.round((completedSteps / totalSteps) * 100);
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to set up your profile.</p>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Personal Fitness Setup
          </CardTitle>
          <Badge variant="outline">
            {calculateProgress()}% Complete
          </Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 p-0 px-6">
        {/* Messages */}
        <ScrollArea className="flex-1 px-2 mb-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                {message.isBot && (
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.isBot ? 'text-left' : 'text-right'}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.isBot
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary text-primary-foreground ml-auto'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.text}
                    </p>
                  </div>
                </div>

                {!message.isBot && (
                  <div className="flex-shrink-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="pb-6">
          {renderInput()}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper Components
interface InputFieldProps {
  onSubmit: (value: string) => void;
  placeholder: string;
  type?: string;
  disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ onSubmit, placeholder, type = 'text', disabled }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Button 
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        size="icon"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
};

// Small Box Components for Individual Questions

interface HeightWeightBoxProps {
  onSubmit: (data: { height: number; weight: number }) => void;
  disabled?: boolean;
}

const HeightWeightBox: React.FC<HeightWeightBoxProps> = ({ onSubmit, disabled }) => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  const handleSubmit = () => {
    const heightNum = Number(height);
    const weightNum = Number(weight);
    
    // Convert to metric if needed
    const heightCm = unit === 'imperial' ? Math.round(heightNum * 30.48) : heightNum;
    const weightKg = unit === 'imperial' ? Math.round(weightNum * 0.453592) : weightNum;

    // Validation
    if (heightCm < 100 || heightCm > 250) {
      toast({
        title: "Invalid Height",
        description: "Height must be between 100-250 cm (3-8 ft)",
        variant: "destructive"
      });
      return;
    }

    if (weightKg < 30 || weightKg > 250) {
      toast({
        title: "Invalid Weight", 
        description: "Weight must be between 30-250 kg (60-550 lbs)",
        variant: "destructive"
      });
      return;
    }

    onSubmit({ height: heightCm, weight: weightKg });
  };

  const isValid = height && weight && Number(height) > 0 && Number(weight) > 0;

  return (
    <div className="p-4 border rounded-lg bg-card space-y-4 max-w-md mx-auto">
      <div className="flex gap-2 justify-center">
        <Button 
          variant={unit === 'metric' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUnit('metric')}
          disabled={disabled}
        >
          Metric
        </Button>
        <Button 
          variant={unit === 'imperial' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUnit('imperial')}
          disabled={disabled}
        >
          Imperial
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium">
            Height ({unit === 'metric' ? 'cm' : 'ft'})
          </Label>
          <Input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder={unit === 'metric' ? '170' : '5.7'}
            step={unit === 'metric' ? '1' : '0.1'}
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">
            Weight ({unit === 'metric' ? 'kg' : 'lbs'})
          </Label>
          <Input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={unit === 'metric' ? '70' : '154'}
            disabled={disabled}
          />
        </div>
      </div>
      
      <Button 
        onClick={handleSubmit}
        disabled={disabled || !isValid}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
};

interface InputBoxProps {
  onSubmit: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

const InputBox: React.FC<InputBoxProps> = ({ onSubmit, placeholder, disabled }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim().length > 10) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card space-y-3 max-w-md mx-auto">
      <div className="space-y-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[80px] text-area"
        />
        <p className="text-xs text-muted-foreground">
          {value.length}/10 characters minimum
        </p>
      </div>
      
      <Button 
        onClick={handleSubmit}
        disabled={disabled || value.trim().length < 10}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
};

interface SelectBoxProps {
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

const SelectBox: React.FC<SelectBoxProps> = ({ options, onSelect, disabled }) => {
  return (
    <div className="p-4 border rounded-lg bg-card space-y-3 max-w-md mx-auto">
      <div className="grid gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            onClick={() => onSelect(option.value)}
            disabled={disabled}
            className="justify-start text-left h-auto p-3 whitespace-normal"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

interface MultiSelectBoxProps {
  options: { value: string; label: string }[];
  onSubmit: (values: string[]) => void;
  disabled?: boolean;
}

const MultiSelectBox: React.FC<MultiSelectBoxProps> = ({ options, onSubmit, disabled }) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const handleToggle = (value: string) => {
    setSelectedValues(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = () => {
    if (selectedValues.length > 0) {
      onSubmit(selectedValues);
      setSelectedValues([]);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card space-y-3 max-w-md mx-auto">
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={option.value}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => handleToggle(option.value)}
              disabled={disabled}
            />
            <Label htmlFor={option.value} className="text-sm cursor-pointer flex-1">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
      
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map(value => {
            const option = options.find(opt => opt.value === value);
            return option ? (
              <Badge key={value} variant="secondary" className="text-xs">
                {option.label}
              </Badge>
            ) : null;
          })}
        </div>
      )}
      
      <Button 
        onClick={handleSubmit}
        disabled={disabled || selectedValues.length === 0}
        className="w-full"
      >
        Continue ({selectedValues.length} selected)
      </Button>
    </div>
  );
};