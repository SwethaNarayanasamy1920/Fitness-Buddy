/**
 * Workout Planner Component for Fit Buddy
 * Generates and displays personalized workout plans
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dumbbell, Clock, Target, Plus, CheckCircle, Save, RefreshCw } from 'lucide-react';
import { generateWorkoutPlan } from '@/lib/aiService';
import { useUserProfile, useWorkoutHistory, type WorkoutRecord } from '@/hooks/useLocalStorage';
import { toast } from '@/hooks/use-toast';

interface WorkoutPlannerProps {
  className?: string;
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  weight?: number;
  duration?: number;
}

export const WorkoutPlanner: React.FC<WorkoutPlannerProps> = ({ className = '' }) => {
  const [userProfile] = useUserProfile();
  const [workoutHistory, setWorkoutHistory] = useWorkoutHistory();
  const [currentWorkout, setCurrentWorkout] = useState<Exercise[]>([]);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  // Generate new workout plan
  const generateNewPlan = async () => {
    if (!userProfile) {
      toast({
        title: "Profile Required",
        description: "Please set up your profile first to get personalized workout recommendations.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const plan = generateWorkoutPlan(userProfile);
      setCurrentWorkout(plan.exercises);
      setCompletedExercises(new Set());
      
      toast({
        title: "Workout Generated!",
        description: `Created a ${plan.duration} ${userProfile.fitnessLevel} workout plan for you.`,
      });
    } catch (error) {
      console.error('Error generating workout plan:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate workout plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle exercise completion
  const toggleExerciseComplete = (index: number) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedExercises(newCompleted);
  };

  // Update exercise weight/duration
  const updateExercise = (index: number, field: 'weight' | 'duration', value: number) => {
    const updatedWorkout = [...currentWorkout];
    updatedWorkout[index] = { ...updatedWorkout[index], [field]: value };
    setCurrentWorkout(updatedWorkout);
  };

  // Add custom exercise
  const addCustomExercise = () => {
    const newExercise: Exercise = {
      name: 'Custom Exercise',
      sets: 3,
      reps: '8-12',
      rest: '60s'
    };
    setCurrentWorkout([...currentWorkout, newExercise]);
  };

  // Update custom exercise name
  const updateExerciseName = (index: number, name: string) => {
    const updatedWorkout = [...currentWorkout];
    updatedWorkout[index] = { ...updatedWorkout[index], name };
    setCurrentWorkout(updatedWorkout);
  };

  // Save completed workout
  const saveWorkout = () => {
    if (currentWorkout.length === 0) {
      toast({
        title: "No Workout to Save",
        description: "Generate or add exercises to your workout first.",
        variant: "destructive"
      });
      return;
    }

    const completedCount = completedExercises.size;
    const totalExercises = currentWorkout.length;
    
    // Calculate estimated calories burned (rough estimate)
    const estimatedCalories = Math.round(completedCount * 50 * (userProfile?.weight || 70) / 70);
    
    // Calculate total duration (sets * (exercise time + rest))
    const estimatedDuration = currentWorkout.reduce((total, exercise) => {
      if (exercise.duration) {
        return total + (exercise.sets * exercise.duration);
      }
      // Estimate 30 seconds per set + rest time
      const restSeconds = parseInt(exercise.rest.replace('s', '')) || 60;
      return total + (exercise.sets * (30 + restSeconds));
    }, 0);

    const workoutRecord: WorkoutRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      exercises: currentWorkout.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        duration: ex.duration
      })),
      totalDuration: estimatedDuration,
      caloriesBurned: estimatedCalories,
      notes: workoutNotes
    };

    setWorkoutHistory([...workoutHistory, workoutRecord]);
    
    // Reset workout state
    setCurrentWorkout([]);
    setCompletedExercises(new Set());
    setWorkoutNotes('');
    
    toast({
      title: "Workout Saved!",
      description: `Great job completing ${completedCount}/${totalExercises} exercises! Estimated ${estimatedCalories} calories burned.`,
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Workout Planner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={generateNewPlan} 
              disabled={isGenerating || !userProfile}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate AI Workout'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={addCustomExercise}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Exercise
            </Button>
            
            {currentWorkout.length > 0 && (
              <Button 
                variant="secondary" 
                onClick={saveWorkout}
                className="flex items-center gap-2 ml-auto"
              >
                <Save className="w-4 h-4" />
                Save Workout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Workout */}
      {currentWorkout.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Today's Workout
              </span>
              <Badge variant="outline">
                {completedExercises.size}/{currentWorkout.length} completed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentWorkout.map((exercise, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant={completedExercises.has(index) ? "default" : "outline"}
                        onClick={() => toggleExerciseComplete(index)}
                      >
                        <CheckCircle className={`w-4 h-4 ${completedExercises.has(index) ? 'text-white' : 'text-muted-foreground'}`} />
                      </Button>
                      
                      <div className="flex-1">
                        <Input
                          value={exercise.name}
                          onChange={(e) => updateExerciseName(index, e.target.value)}
                          className="font-semibold border-none p-0 h-auto bg-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{exercise.sets} sets</Badge>
                      <Badge variant="secondary">{exercise.reps} reps</Badge>
                      <Badge variant="outline">{exercise.rest} rest</Badge>
                    </div>
                  </div>

                  {/* Exercise tracking inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`weight-${index}`} className="text-xs">Weight (kg)</Label>
                      <Input
                        id={`weight-${index}`}
                        type="number"
                        value={exercise.weight || ''}
                        onChange={(e) => updateExercise(index, 'weight', Number(e.target.value))}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`duration-${index}`} className="text-xs">Duration (seconds)</Label>
                      <Input
                        id={`duration-${index}`}
                        type="number"
                        value={exercise.duration || ''}
                        onChange={(e) => updateExercise(index, 'duration', Number(e.target.value))}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            {/* Workout Notes */}
            <div className="space-y-2">
              <Label htmlFor="workout-notes">Workout Notes</Label>
              <Textarea
                id="workout-notes"
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                placeholder="How did the workout feel? Any observations or modifications..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Requirement Message */}
      {!userProfile && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Set Up Your Profile</h3>
            <p className="text-muted-foreground mb-4">
              Complete your fitness profile to get personalized AI-generated workout plans tailored to your goals and fitness level.
            </p>
            <Button variant="outline">Complete Profile Setup</Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Workouts */}
      {workoutHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workoutHistory.slice(-5).reverse().map((workout, index) => (
                <div key={workout.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">
                      {new Date(workout.date).toLocaleDateString()}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{workout.exercises.length} exercises</Badge>
                      <Badge variant="secondary">{Math.round(workout.totalDuration / 60)}min</Badge>
                      {workout.caloriesBurned && (
                        <Badge>{workout.caloriesBurned} cal</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <strong>Exercises:</strong> {workout.exercises.map(ex => ex.name).join(', ')}
                  </div>
                  
                  {workout.notes && (
                    <div className="text-sm text-muted-foreground mt-2">
                      <strong>Notes:</strong> {workout.notes}
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