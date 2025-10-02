/**
 * Profile Setup Component for Fit Buddy
 * Collects user information for personalized AI recommendations using Supabase
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Target, Dumbbell, Save, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserProfile } from '@/hooks/useSupabaseData';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

interface ProfileSetupProps {
  className?: string;
  onComplete?: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ className = '', onComplete }) => {
  const { user } = useSupabaseAuth();
  const { profile: userProfile } = useUserProfile(user?.id);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ProfileInsert>>({
    name: '',
    age: 25,
    weight: 70,
    height: 170,
    gender: 'male',
    fitness_level: 'beginner',
    goals: [],
    equipment: [],
    dietary_restrictions: [],
    activity_level: 'moderately_active'
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        age: userProfile.age || 25,
        weight: userProfile.weight || 70,
        height: userProfile.height || 170,
        gender: userProfile.gender || 'male',
        fitness_level: userProfile.fitness_level || 'beginner',
        goals: userProfile.goals || [],
        equipment: userProfile.equipment || [],
        dietary_restrictions: userProfile.dietary_restrictions || [],
        activity_level: userProfile.activity_level || 'moderately_active'
      });
    }
  }, [userProfile]);

  const fitnessGoals = [
    { id: 'weight_loss', label: 'Weight Loss' },
    { id: 'muscle_gain', label: 'Muscle Gain' },
    { id: 'strength', label: 'Build Strength' },
    { id: 'endurance', label: 'Improve Endurance' },
    { id: 'flexibility', label: 'Increase Flexibility' },
    { id: 'health', label: 'General Health' }
  ];

  const availableEquipment = [
    { id: 'bodyweight', label: 'Bodyweight Only' },
    { id: 'dumbbells', label: 'Dumbbells' },
    { id: 'barbell', label: 'Barbell' },
    { id: 'resistance_bands', label: 'Resistance Bands' },
    { id: 'kettlebells', label: 'Kettlebells' },
    { id: 'gym_access', label: 'Full Gym Access' },
    { id: 'cardio_machine', label: 'Cardio Machines' },
    { id: 'pull_up_bar', label: 'Pull-up Bar' }
  ];

  const dietaryOptions = [
    { id: 'none', label: 'No Restrictions' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'keto', label: 'Ketogenic' },
    { id: 'paleo', label: 'Paleo' },
    { id: 'gluten_free', label: 'Gluten Free' },
    { id: 'dairy_free', label: 'Dairy Free' },
    { id: 'low_carb', label: 'Low Carb' }
  ];

  const handleInputChange = (field: keyof ProfileInsert, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: 'goals' | 'equipment' | 'dietary_restrictions', value: string) => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      const isSelected = currentArray.includes(value);
      
      return {
        ...prev,
        [field]: isSelected
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value]
      };
    });
  };

  const calculateBMI = () => {
    if (formData.weight && formData.height) {
      const heightInMeters = formData.height / 100;
      return (formData.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const isFormValid = () => {
    return formData.name && 
           formData.age && 
           formData.weight && 
           formData.height && 
           formData.gender && 
           formData.fitness_level && 
           formData.activity_level &&
           (formData.goals?.length || 0) > 0 &&
           (formData.equipment?.length || 0) > 0;
  };

  const saveProfile = async () => {
    if (!user || !isFormValid()) {
      toast({
        title: "Incomplete Profile",
        description: "Please fill in all required fields and select at least one goal and equipment option.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const profileData: ProfileInsert = {
        ...formData as ProfileInsert,
        user_id: user.id
      };

      if (userProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Profile Updated!",
          description: "Your fitness profile has been updated successfully.",
        });
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert(profileData);

        if (error) throw error;

        toast({
          title: "Profile Created!",
          description: "Your fitness profile has been created. You'll now get personalized AI recommendations.",
        });
      }

      onComplete?.();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const bmi = calculateBMI();
  const bmiInfo = bmi ? getBMICategory(parseFloat(bmi)) : null;

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to set up your profile.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Fitness Profile Setup
            {userProfile && <CheckCircle className="w-5 h-5 text-accent" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Help us create a personalized fitness experience by sharing some information about yourself and your goals.
          </p>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                value={formData.age || ''}
                onChange={(e) => handleInputChange('age', Number(e.target.value))}
                placeholder="Enter your age"
                min="13"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', Number(e.target.value))}
                placeholder="Enter your weight"
                min="30"
                max="300"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height (cm) *</Label>
              <Input
                id="height"
                type="number"
                value={formData.height || ''}
                onChange={(e) => handleInputChange('height', Number(e.target.value))}
                placeholder="Enter your height"
                min="100"
                max="250"
              />
            </div>

            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select value={formData.gender} onValueChange={(value: any) => handleInputChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fitness Level *</Label>
              <Select value={formData.fitness_level} onValueChange={(value: any) => handleInputChange('fitness_level', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fitness level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner (0-6 months)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (6+ months)</SelectItem>
                  <SelectItem value="advanced">Advanced (2+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* BMI Calculation */}
          {bmi && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">BMI</span>
                <div className="text-right">
                  <span className="text-2xl font-bold">{bmi}</span>
                  {bmiInfo && (
                    <span className={`ml-2 text-sm ${bmiInfo.color}`}>
                      {bmiInfo.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Level */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Level *</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={formData.activity_level} onValueChange={(value: any) => handleInputChange('activity_level', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select activity level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentary (desk job, no exercise)</SelectItem>
              <SelectItem value="lightly_active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
              <SelectItem value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
              <SelectItem value="very_active">Very Active (hard exercise 6-7 days/week)</SelectItem>
              <SelectItem value="extra_active">Extra Active (very hard exercise, physical job)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Fitness Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Fitness Goals *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {fitnessGoals.map((goal) => (
              <div key={goal.id} className="flex items-center space-x-2">
                <Checkbox
                  id={goal.id}
                  checked={(formData.goals || []).includes(goal.id)}
                  onCheckedChange={() => handleArrayToggle('goals', goal.id)}
                />
                <Label htmlFor={goal.id} className="text-sm font-medium">
                  {goal.label}
                </Label>
              </div>
            ))}
          </div>
          
          {formData.goals && formData.goals.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {formData.goals.map(goalId => {
                const goal = fitnessGoals.find(g => g.id === goalId);
                return goal ? (
                  <Badge key={goalId} variant="secondary">
                    {goal.label}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Available Equipment *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {availableEquipment.map((equipment) => (
              <div key={equipment.id} className="flex items-center space-x-2">
                <Checkbox
                  id={equipment.id}
                  checked={(formData.equipment || []).includes(equipment.id)}
                  onCheckedChange={() => handleArrayToggle('equipment', equipment.id)}
                />
                <Label htmlFor={equipment.id} className="text-sm font-medium">
                  {equipment.label}
                </Label>
              </div>
            ))}
          </div>
          
          {formData.equipment && formData.equipment.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {formData.equipment.map(equipmentId => {
                const equipment = availableEquipment.find(e => e.id === equipmentId);
                return equipment ? (
                  <Badge key={equipmentId} variant="secondary">
                    {equipment.label}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dietary Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dietary Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dietaryOptions.map((diet) => (
              <div key={diet.id} className="flex items-center space-x-2">
                <Checkbox
                  id={diet.id}
                  checked={(formData.dietary_restrictions || []).includes(diet.id)}
                  onCheckedChange={() => handleArrayToggle('dietary_restrictions', diet.id)}
                />
                <Label htmlFor={diet.id} className="text-sm font-medium">
                  {diet.label}
                </Label>
              </div>
            ))}
          </div>
          
          {formData.dietary_restrictions && formData.dietary_restrictions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {formData.dietary_restrictions.map(dietId => {
                const diet = dietaryOptions.find(d => d.id === dietId);
                return diet ? (
                  <Badge key={dietId} variant="outline">
                    {diet.label}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={saveProfile} 
            className="w-full" 
            size="lg"
            disabled={!isFormValid() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {userProfile ? 'Update Profile' : 'Create Profile'}
              </>
            )}
          </Button>
          
          {!isFormValid() && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Please complete all required fields (marked with *)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};