/**
 * Progress Dashboard Component for Fit Buddy
 * Displays user progress with charts and statistics
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, Target, Award, Dumbbell, Apple, Scale, Clock } from 'lucide-react';
import { useWorkoutHistory, useMealHistory, useProgressHistory, useUserProfile } from '@/hooks/useLocalStorage';
import { format, subDays, parseISO } from 'date-fns';

interface ProgressDashboardProps {
  className?: string;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ className = '' }) => {
  const [workoutHistory] = useWorkoutHistory();
  const [mealHistory] = useMealHistory();
  const [progressHistory] = useProgressHistory();
  const [userProfile] = useUserProfile();

  // Calculate statistics
  const stats = useMemo(() => {
    const last30Days = subDays(new Date(), 30);
    
    const recentWorkouts = workoutHistory.filter(workout => 
      parseISO(workout.date) >= last30Days
    );
    
    const recentMeals = mealHistory.filter(meal => 
      parseISO(meal.date) >= last30Days
    );

    const totalWorkouts = recentWorkouts.length;
    const totalExercises = recentWorkouts.reduce((sum, workout) => sum + workout.exercises.length, 0);
    const totalDuration = recentWorkouts.reduce((sum, workout) => sum + workout.totalDuration, 0);
    const totalCaloriesBurned = recentWorkouts.reduce((sum, workout) => sum + (workout.caloriesBurned || 0), 0);
    
    const totalMeals = recentMeals.length;
    const totalCaloriesConsumed = recentMeals.reduce((sum, meal) => sum + meal.totalCalories, 0);
    const avgCaloriesPerDay = totalMeals > 0 ? Math.round(totalCaloriesConsumed / Math.min(30, totalMeals)) : 0;

    const currentWeight = progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].weight : userProfile?.weight;
    const initialWeight = progressHistory.length > 0 ? progressHistory[0].weight : userProfile?.weight;
    const weightChange = currentWeight && initialWeight ? currentWeight - initialWeight : 0;

    return {
      workouts: {
        total: totalWorkouts,
        exercises: totalExercises,
        duration: Math.round(totalDuration / 60), // Convert to hours
        caloriesBurned: totalCaloriesBurned
      },
      nutrition: {
        meals: totalMeals,
        avgCalories: avgCaloriesPerDay,
        totalCalories: totalCaloriesConsumed
      },
      progress: {
        weightChange,
        currentWeight
      }
    };
  }, [workoutHistory, mealHistory, progressHistory, userProfile]);

  // Prepare chart data
  const workoutTrendData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayWorkouts = workoutHistory.filter(workout => workout.date.startsWith(dateStr));
      
      return {
        date: format(date, 'MMM dd'),
        workouts: dayWorkouts.length,
        duration: dayWorkouts.reduce((sum, w) => sum + w.totalDuration, 0) / 60,
        calories: dayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0)
      };
    });
    
    return last14Days;
  }, [workoutHistory]);

  const weightProgressData = useMemo(() => {
    return progressHistory.map(progress => ({
      date: format(parseISO(progress.date), 'MMM dd'),
      weight: progress.weight || 0,
      bodyFat: progress.bodyFat || 0
    }));
  }, [progressHistory]);

  const exerciseTypeData = useMemo(() => {
    const exerciseCount: Record<string, number> = {};
    
    workoutHistory.forEach(workout => {
      workout.exercises.forEach(exercise => {
        const type = exercise.name.toLowerCase().includes('cardio') ? 'Cardio' :
                    exercise.name.toLowerCase().includes('strength') ? 'Strength' :
                    exercise.name.toLowerCase().includes('yoga') ? 'Flexibility' : 'Other';
        exerciseCount[type] = (exerciseCount[type] || 0) + 1;
      });
    });

    return Object.entries(exerciseCount).map(([name, value]) => ({ name, value }));
  }, [workoutHistory]);

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--secondary))'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workouts (30d)</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.workouts.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.workouts.exercises} total exercises
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Trained</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.workouts.duration}h</div>
            <p className="text-xs text-muted-foreground">
              {stats.workouts.caloriesBurned} calories burned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Calories</CardTitle>
            <Apple className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.nutrition.avgCalories}</div>
            <p className="text-xs text-muted-foreground">
              {stats.nutrition.meals} meals logged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weight Change</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.progress.weightChange >= 0 ? 'text-accent' : 'text-primary'}`}>
              {stats.progress.weightChange >= 0 ? '+' : ''}{stats.progress.weightChange?.toFixed(1) || '0'}kg
            </div>
            <p className="text-xs text-muted-foreground">
              Current: {stats.progress.currentWeight?.toFixed(1) || 'N/A'}kg
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workout Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Workout Trend (14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={workoutTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="workouts" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  name="Workouts"
                />
                <Line 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2} 
                  name="Duration (h)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weight Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Weight Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weightProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weightProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    name="Weight (kg)"
                  />
                  {weightProgressData.some(d => d.bodyFat > 0) && (
                    <Line 
                      type="monotone" 
                      dataKey="bodyFat" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2} 
                      name="Body Fat %"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No weight data recorded yet</p>
                  <p className="text-sm">Start tracking your progress!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exercise Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Exercise Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exerciseTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={exerciseTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {exerciseTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No workout data yet</p>
                  <p className="text-sm">Complete some workouts to see distribution!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {[...workoutHistory, ...mealHistory]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((activity, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-3">
                      {'exercises' in activity ? (
                        <Dumbbell className="w-4 h-4 text-primary" />
                      ) : (
                        <Apple className="w-4 h-4 text-accent" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {'exercises' in activity 
                            ? `Workout (${activity.exercises.length} exercises)` 
                            : `${activity.mealType} - ${activity.totalCalories} cal`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(activity.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {'exercises' in activity 
                        ? `${Math.round(activity.totalDuration / 60)}min`
                        : `${activity.foods.length} items`
                      }
                    </Badge>
                  </div>
                ))}
              
              {workoutHistory.length === 0 && mealHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activities recorded yet</p>
                  <p className="text-xs">Start your fitness journey!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};