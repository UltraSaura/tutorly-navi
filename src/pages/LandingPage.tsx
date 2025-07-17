import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to Learning Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Transform your learning experience with AI-powered education tools.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link to="/dashboard">Get Started</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;