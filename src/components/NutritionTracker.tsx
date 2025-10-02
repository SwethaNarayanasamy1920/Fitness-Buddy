/**
 * Nutrition Tracker Component for Fit Buddy
 * Tracks meals, calories, and provides diet recommendations
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Apple, Plus, Target, TrendingUp, Utensils, Save, Lightbulb } from 'lucide-react';
import { generateDietPlan } from '@/lib/aiService';
import { useUserProfile, useMealHistory, type MealRecord } from '@/hooks/useLocalStorage';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface NutritionTrackerProps {
  className?: string;
}

interface Food {
  name: string;
  quantity: string;
  calories: number;
}

export const NutritionTracker: React.FC<NutritionTrackerProps> = ({ className = '' }) => {
  const [userProfile] = useUserProfile();
  const [mealHistory, setMealHistory] = useMealHistory();
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [currentFoods, setCurrentFoods] = useState<Food[]>([{ name: '', quantity: '', calories: 0 }]);
  const [mealNotes, setMealNotes] = useState('');
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [showDietPlan, setShowDietPlan] = useState(false);

  // Calculate daily nutrition stats
  const todayStats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayMeals = mealHistory.filter(meal => meal.date.startsWith(today));
    
    const totalCalories = todayMeals.reduce((sum, meal) => sum + meal.totalCalories, 0);
    const mealBreakdown = {
      breakfast: todayMeals.filter(m => m.mealType === 'breakfast').reduce((s, m) => s + m.totalCalories, 0),
      lunch: todayMeals.filter(m => m.mealType === 'lunch').reduce((s, m) => s + m.totalCalories, 0),
      dinner: todayMeals.filter(m => m.mealType === 'dinner').reduce((s, m) => s + m.totalCalories, 0),
      snack: todayMeals.filter(m => m.mealType === 'snack').reduce((s, m) => s + m.totalCalories, 0),
    };

    // Get target calories from profile or diet plan
    let targetCalories = 2000; // Default
    if (dietPlan?.targetCalories) {
      targetCalories = dietPlan.targetCalories;
    } else if (userProfile) {
      // Simple calculation if no diet plan
      const bmr = userProfile.gender === 'male' 
        ? 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age + 5
        : 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age - 161;
      targetCalories = Math.round(bmr * 1.375); // Light activity
    }

    const remainingCalories = targetCalories - totalCalories;
    const progress = Math.min((totalCalories / targetCalories) * 100, 100);

    return {
      totalCalories,
      targetCalories,
      remainingCalories,
      progress,
      mealBreakdown,
      mealsToday: todayMeals.length
    };
  }, [mealHistory, dietPlan, userProfile]);

  // Generate diet plan
  const generateDietRecommendation = () => {
    if (!userProfile) {
      toast({
        title: "Profile Required",
        description: "Please set up your profile first to get personalized nutrition recommendations.",
        variant: "destructive"
      });
      return;
    }

    try {
      const plan = generateDietPlan(userProfile);
      setDietPlan(plan);
      setShowDietPlan(true);
      
      toast({
        title: "Diet Plan Generated!",
        description: `Created a personalized nutrition plan with ${plan.targetCalories} daily calories.`,
      });
    } catch (error) {
      console.error('Error generating diet plan:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate diet plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add new food item
  const addFood = () => {
    setCurrentFoods([...currentFoods, { name: '', quantity: '', calories: 0 }]);
  };

  // Update food item
  const updateFood = (index: number, field: keyof Food, value: string | number) => {
    const updatedFoods = [...currentFoods];
    updatedFoods[index] = { ...updatedFoods[index], [field]: value };
    setCurrentFoods(updatedFoods);
  };

  // Remove food item
  const removeFood = (index: number) => {
    if (currentFoods.length > 1) {
      setCurrentFoods(currentFoods.filter((_, i) => i !== index));
    }
  };

  // Save meal
  const saveMeal = () => {
    const validFoods = currentFoods.filter(food => food.name.trim() && food.calories > 0);
    
    if (validFoods.length === 0) {
      toast({
        title: "No Food Items",
        description: "Please add at least one food item with calories.",
        variant: "destructive"
      });
      return;
    }

    const totalCalories = validFoods.reduce((sum, food) => sum + food.calories, 0);

    const mealRecord: MealRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mealType: selectedMealType,
      foods: validFoods,
      totalCalories,
      notes: mealNotes
    };

    setMealHistory([...mealHistory, mealRecord]);
    
    // Reset form
    setCurrentFoods([{ name: '', quantity: '', calories: 0 }]);
    setMealNotes('');
    
    toast({
      title: "Meal Saved!",
      description: `Added ${validFoods.length} food items (${totalCalories} calories) to ${selectedMealType}.`,
    });
  };

  // Quick add common foods
  const quickAddFood = (name: string, calories: number, quantity: string = '1 serving') => {
    const newFood: Food = { name, quantity, calories };
    setCurrentFoods([...currentFoods.filter(f => f.name || f.calories), newFood]);
  };

  const commonFoods = [
    { name: 'Banana', calories: 105, quantity: '1 medium' },
    { name: 'Apple', calories: 95, quantity: '1 medium' },
    { name: 'Chicken Breast', calories: 165, quantity: '100g' },
    { name: 'Brown Rice', calories: 110, quantity: '1/2 cup cooked' },
    { name: 'Greek Yogurt', calories: 130, quantity: '1 cup' },
    { name: 'Almonds', calories: 160, quantity: '28g (23 nuts)' }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Daily Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="w-5 h-5 text-primary" />
            Today's Nutrition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{todayStats.totalCalories}</h3>
                <p className="text-sm text-muted-foreground">
                  of {todayStats.targetCalories} calories
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-semibold ${todayStats.remainingCalories >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {todayStats.remainingCalories >= 0 ? todayStats.remainingCalories : Math.abs(todayStats.remainingCalories)} 
                  {todayStats.remainingCalories >= 0 ? ' left' : ' over'}
                </p>
                <p className="text-sm text-muted-foreground">{todayStats.mealsToday} meals logged</p>
              </div>
            </div>

            <Progress value={todayStats.progress} className="w-full" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Breakfast</p>
                <p className="font-semibold">{todayStats.mealBreakdown.breakfast}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Lunch</p>
                <p className="font-semibold">{todayStats.mealBreakdown.lunch}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Dinner</p>
                <p className="font-semibold">{todayStats.mealBreakdown.dinner}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Snacks</p>
                <p className="font-semibold">{todayStats.mealBreakdown.snack}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Meal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Log Meal
            </span>
            <Button onClick={generateDietRecommendation} variant="outline" size="sm">
              <Lightbulb className="w-4 h-4 mr-2" />
              Get Diet Plan
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Meal Type Selection */}
            <div className="space-y-2">
              <Label>Meal Type</Label>
              <Select value={selectedMealType} onValueChange={(value: any) => setSelectedMealType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Add Common Foods */}
            <div className="space-y-2">
              <Label>Quick Add</Label>
              <div className="flex flex-wrap gap-2">
                {commonFoods.map((food, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => quickAddFood(food.name, food.calories, food.quantity)}
                  >
                    {food.name} ({food.calories} cal)
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Food Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Food Items</Label>
                <Button onClick={addFood} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {currentFoods.map((food, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="md:col-span-2">
                    <Label htmlFor={`food-name-${index}`}>Food Name</Label>
                    <Input
                      id={`food-name-${index}`}
                      value={food.name}
                      onChange={(e) => updateFood(index, 'name', e.target.value)}
                      placeholder="e.g., Grilled Chicken Breast"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`food-quantity-${index}`}>Quantity</Label>
                    <Input
                      id={`food-quantity-${index}`}
                      value={food.quantity}
                      onChange={(e) => updateFood(index, 'quantity', e.target.value)}
                      placeholder="e.g., 100g, 1 cup"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`food-calories-${index}`}>Calories</Label>
                      <Input
                        id={`food-calories-${index}`}
                        type="number"
                        value={food.calories || ''}
                        onChange={(e) => updateFood(index, 'calories', Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    {currentFoods.length > 1 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeFood(index)}
                        className="mt-6"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Meal Notes */}
            <div className="space-y-2">
              <Label htmlFor="meal-notes">Notes (Optional)</Label>
              <Textarea
                id="meal-notes"
                value={mealNotes}
                onChange={(e) => setMealNotes(e.target.value)}
                placeholder="Any notes about this meal..."
                rows={2}
              />
            </div>

            {/* Total Calories */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="font-semibold">Total Calories:</span>
              <span className="text-xl font-bold text-primary">
                {currentFoods.reduce((sum, food) => sum + (food.calories || 0), 0)}
              </span>
            </div>

            <Button onClick={saveMeal} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Meal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diet Plan */}
      {showDietPlan && dietPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Personalized Diet Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Calorie Goals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-semibold text-primary">Daily Calories</h4>
                  <p className="text-2xl font-bold">{dietPlan.targetCalories}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-semibold text-accent">Protein</h4>
                  <p className="text-2xl font-bold">{dietPlan.macros.protein}g</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-semibold text-muted-foreground">Carbs / Fats</h4>
                  <p className="text-lg font-bold">{dietPlan.macros.carbs}g / {dietPlan.macros.fats}g</p>
                </div>
              </div>

              {/* Sample Meal Plan */}
              <div className="space-y-4">
                <h4 className="font-semibold">Sample Meal Plan</h4>
                {Object.entries(dietPlan.mealPlan).map(([mealType, foods]) => (
                  <div key={mealType} className="border rounded-lg p-4">
                    <h5 className="font-semibold capitalize mb-2">{mealType}</h5>
                    <ul className="space-y-1">
                      {(foods as string[]).map((food, index) => (
                        <li key={index} className="text-sm text-muted-foreground">• {food}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <h4 className="font-semibold">Nutrition Tips</h4>
                <ul className="space-y-1">
                  {dietPlan.tips.map((tip: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Meals */}
      {mealHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Meals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mealHistory.slice(-5).reverse().map((meal) => (
                <div key={meal.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold capitalize">
                      {meal.mealType} - {new Date(meal.date).toLocaleDateString()}
                    </h4>
                    <Badge>{meal.totalCalories} calories</Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <strong>Foods:</strong> {meal.foods.map(f => `${f.name} (${f.quantity})`).join(', ')}
                  </div>
                  
                  {meal.notes && (
                    <div className="text-sm text-muted-foreground mt-2">
                      <strong>Notes:</strong> {meal.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};