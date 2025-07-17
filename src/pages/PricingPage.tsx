import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PricingPage = () => {
  return (
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-12">Pricing Plans</h1>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Basic</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$9<span className="text-sm">/month</span></div>
                <ul className="space-y-2 mb-6">
                  <li>✓ Access to basic features</li>
                  <li>✓ Email support</li>
                  <li>✓ Limited AI interactions</li>
                </ul>
                <Button className="w-full">Choose Basic</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>For serious learners</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$29<span className="text-sm">/month</span></div>
                <ul className="space-y-2 mb-6">
                  <li>✓ All basic features</li>
                  <li>✓ Priority support</li>
                  <li>✓ Unlimited AI interactions</li>
                  <li>✓ Advanced analytics</li>
                </ul>
                <Button className="w-full">Choose Pro</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;