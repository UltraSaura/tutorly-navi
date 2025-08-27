import { Link, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LanguageSelector from "@/components/ui/language-selector";
import { useAuth } from "@/context/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { MessageCircle, BookOpen, BarChart3, Award, Settings, Sparkles, Brain, LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminAuth();
  const { t } = useTranslation();
  const location = useLocation();

  // Show loading while checking auth and admin status
  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // For authenticated users, check if they're trying to access admin routes
  if (user) {
    // If user is admin and trying to access admin routes, don't redirect
    if (isAdmin && (location.pathname.startsWith('/admin') || location.pathname.startsWith('/management'))) {
      // Let the admin routes handle the navigation
      return null;
    }
    // Otherwise, redirect to chat for regular users
    return <Navigate to="/chat" replace />;
  }

  const userFeatures = [
    {
      icon: MessageCircle,
      title: "AI-Powered Tutoring",
      description: "Get instant help with homework and receive personalized explanations tailored to your learning style.",
      badge: "Smart"
    },
    {
      icon: BookOpen,
      title: "Learning Roadmap", 
      description: "Follow a structured path designed to build your knowledge progressively and efficiently.",
      badge: "Guided"
    },
    {
      icon: BarChart3,
      title: "Grade Tracking",
      description: "Monitor your academic progress with detailed analytics and performance insights.",
      badge: "Analytics"
    },
    {
      icon: Award,
      title: "Skill Mastery",
      description: "Track your competency levels and earn achievements as you master new concepts.",
      badge: "Achievement"
    }
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/10">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Brain className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            StudyWhiz AI
          </span>
        </div>
        <LanguageSelector />
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6 text-sm font-medium">
            <Sparkles className="mr-2 h-4 w-4" />
            Next-Generation Learning Platform
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-secondary bg-clip-text text-transparent leading-tight">
            AI-Powered Education
            <br />
            <span className="text-primary">Personalized for You</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Submit your homework and exercises to receive instant, personalized tutoring. 
            Our AI adapts to your learning style and helps you master any subject.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/auth">
                <LogIn className="mr-2 h-5 w-5" />
                Sign In / Register
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link to="/management">
                <Settings className="mr-2 h-5 w-5" />
                Admin Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Student Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">For Students</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock your potential with AI-powered learning tools designed to accelerate your academic success.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {userFeatures.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <feature.icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                  <Badge variant="outline" className="text-xs">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Card>
          ))}
        </div>
      </section>


      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center border-t border-border/50 mt-16">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Brain className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">StudyWhiz AI</span>
        </div>
        <p className="text-muted-foreground text-sm mb-2">
          Submit your homework and exercises and get personalized tutoring.
        </p>
        <p className="text-muted-foreground text-xs">
          © 2024 StudyWhiz AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Index;