import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, TrendingUp, Dumbbell, Apple, User, Menu, Heart, Zap, Target, LogOut, Loader2 } from 'lucide-react';
import { ChatInterface } from '@/components/ChatInterface';
import { ProgressDashboard } from '@/components/ProgressDashboard';
import { WorkoutPlanner } from '@/components/WorkoutPlanner';
import { NutritionTracker } from '@/components/NutritionTracker';
import { ProfileSetup } from '@/components/ProfileSetup';
import { ConversationalOnboarding } from '@/components/ConversationalOnboarding';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserProfile } from '@/hooks/useSupabaseData';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

type ActiveView = 'chat' | 'progress' | 'workout' | 'nutrition' | 'profile';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const { profile: userProfile } = useUserProfile(user?.id);
  const navigate = useNavigate();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your fitness journey...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast({
        title: "Signed out",
        description: "Come back soon to continue your fitness journey!",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const sidebarItems = [
    { id: 'chat', label: 'AI Coach', icon: MessageCircle, description: 'Chat with your fitness AI' },
    { id: 'progress', label: 'Progress', icon: TrendingUp, description: 'Track your fitness journey' },
    { id: 'workout', label: 'Workouts', icon: Dumbbell, description: 'Plan and log workouts' },
    { id: 'nutrition', label: 'Nutrition', icon: Apple, description: 'Track meals and diet' },
    { id: 'profile', label: 'Profile', icon: User, description: 'Manage your fitness profile' }
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'chat':
        return <ChatInterface />;
      case 'progress':
        return <ProgressDashboard />;
      case 'workout':
        return <WorkoutPlanner />;
      case 'nutrition':
        return <NutritionTracker />;
      case 'profile':
        return userProfile ? 
          <ProfileSetup onComplete={() => setActiveView('chat')} /> :
          <ConversationalOnboarding onComplete={() => setActiveView('chat')} />;
      default:
        return <ChatInterface />;
    }
  };

  const getWelcomeMessage = () => {
    if (!userProfile) {
      return "Complete your profile to unlock personalized AI coaching!";
    }
    
    const goals = userProfile.goals || [];
    const goalText = goals.length > 0 ? goals.join(', ').replace(/_/g, ' ') : 'fitness';
    
    return `Welcome back, ${userProfile.name}! Ready to work on ${goalText}?`;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background to-muted/30">
        {/* Sidebar */}
        <Sidebar variant="inset" className="border-r border-border/40">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Fit Buddy</h2>
                <p className="text-sm text-muted-foreground">AI Fitness Coach</p>
              </div>
            </div>
          </SidebarHeader>

          <Separator />

          <SidebarContent className="p-4">
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveView(item.id as ActiveView)}
                    isActive={activeView === item.id}
                    className="w-full justify-start p-3 mb-2"
                  >
                    <item.icon className="w-5 h-5" />
                    <div className="flex flex-col items-start flex-1">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

            {/* Profile Status */}
            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-accent" />
                <span className="font-medium text-sm">Profile Status</span>
              </div>
              {userProfile ? (
                <div className="space-y-2">
                  <Badge className="bg-accent text-accent-foreground">
                    Profile Complete
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Level: {userProfile.fitness_level}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Goals: {userProfile.goals?.length || 0} selected
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Badge variant="outline">Setup Required</Badge>
                  <p className="text-xs text-muted-foreground">
                    Complete your profile for personalized coaching
                  </p>
                </div>
              )}
            </div>
          </SidebarContent>

          <SidebarFooter className="p-4">
            <Button 
              onClick={handleSignOut}
              variant="outline" 
              size="sm" 
              className="w-full mb-3"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <div className="text-xs text-muted-foreground text-center">
              <p>Signed in as {user.email}</p>
              <p className="mt-1">Your fitness journey starts here!</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold">
                    {sidebarItems.find(item => item.id === activeView)?.label || 'Fit Buddy'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {getWelcomeMessage()}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              {userProfile && (
                <div className="hidden md:flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="font-semibold capitalize">{userProfile.fitness_level}</p>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Goals</p>
                    <p className="font-semibold">{userProfile.goals?.length || 0}</p>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Equipment</p>
                    <p className="font-semibold">{userProfile.equipment?.length || 0}</p>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {!userProfile && activeView !== 'profile' && (
                <Card className="mb-6 border-accent/20 bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Target className="w-8 h-8 text-accent" />
                      <div className="flex-1">
                        <h3 className="font-semibold">Welcome to Fit Buddy!</h3>
                        <p className="text-sm text-muted-foreground">
                          Set up your profile to unlock personalized AI coaching, custom workout plans, and nutrition guidance.
                        </p>
                      </div>
                      <Button onClick={() => setActiveView('profile')}>
                        Start Setup
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {renderActiveView()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
