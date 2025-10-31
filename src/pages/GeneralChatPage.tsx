import React from 'react';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeaderNavigation } from '@/components/layout/HeaderNavigation';

const GeneralChatPage: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0))] pointer-events-none"></div>
      
      <div className="flex flex-col flex-1 relative">
        {/* Header with Navigation */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16">
          <HeaderNavigation />
        </header>
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                  {language === 'fr' ? 'Chat Général' : 'General Chat'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <p className="text-lg text-muted-foreground">
                    {language === 'fr' ? 'La fonctionnalité de chat général arrive bientôt !' : 'General chat functionality is coming soon!'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'Cette page gérera toutes les questions non-mathématiques et conversations générales.' : 'This page will handle all non-mathematical questions and general conversations.'}
                  </p>
                  <div className="mt-8">
                    <a 
                      href="/chat" 
                      className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      {language === 'fr' ? 'Retour au Chat Math' : 'Back to Math Chat'}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GeneralChatPage;