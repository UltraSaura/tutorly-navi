import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { useChat } from "@/hooks/useChat";
import MessageList from "@/components/user/chat/MessageList";
import { useState } from "react";
import { 
  MessageCircle, 
  Book, 
  HelpCircle, 
  Mail, 
  Phone, 
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  History
} from "lucide-react";

const SupportPage = () => {
  const { t } = useLanguage();
  const { filteredMessages } = useChat();
  const [showChatHistory, setShowChatHistory] = useState(false);

  const contactMethods = [
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Get instant help from our support team",
      availability: "24/7",
      status: "online",
      action: "Start Chat"
    },
    {
      icon: Mail,
      title: "Email Support",
      description: "Send us a detailed message about your issue",
      availability: "Response within 24h",
      status: "available",
      action: "Send Email"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak directly with our technical team",
      availability: "Mon-Fri 9AM-6PM",
      status: "business-hours",
      action: "Call Now"
    }
  ];

  const faqItems = [
    {
      question: "How do I submit homework for AI tutoring?",
      answer: "Navigate to the Tutor section and upload your homework documents or type your questions directly. Our AI will analyze and provide personalized explanations."
    },
    {
      question: "How does the grading system work?",
      answer: "Our AI evaluates your submissions based on accuracy, methodology, and understanding. You'll receive detailed feedback and suggestions for improvement."
    },
    {
      question: "Can I track my learning progress?",
      answer: "Yes! Visit the Dashboard to see your progress across subjects, skill mastery levels, and performance analytics."
    },
    {
      question: "What subjects are supported?",
      answer: "Stuwy supports mathematics, science, literature, history, and many other subjects. Our AI adapts to different academic levels and curricula."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade encryption and follow strict privacy policies to protect your academic data and personal information."
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'available':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'business-hours':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'available':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'business-hours':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
        <p className="text-muted-foreground">
          Get help with Stuwy AI and make the most of your learning experience
        </p>
      </div>

      {/* Quick Help Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {contactMethods.map((method, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <method.icon className="h-8 w-8 text-primary" />
                <div className="flex items-center gap-2">
                  {getStatusIcon(method.status)}
                  <Badge className={getStatusColor(method.status)}>
                    {method.availability}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-lg">{method.title}</CardTitle>
              <CardDescription>{method.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant={method.status === 'online' ? 'default' : 'outline'}>
                {method.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chat History Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <CardTitle>Chat History</CardTitle>
          </div>
          <CardDescription>
            Review your previous conversations and interactions with the AI tutor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Sheet open={showChatHistory} onOpenChange={setShowChatHistory}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <History className="mr-2 h-4 w-4" />
                View Chat History
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[500px] sm:w-[600px]">
              <SheetHeader>
                <SheetTitle>Chat History</SheetTitle>
              </SheetHeader>
              <div className="h-full mt-6">
                <MessageList messages={filteredMessages} isLoading={false} />
              </div>
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        </div>
        
        <div className="grid gap-4">
          {faqItems.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Documentation Link */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Book className="h-6 w-6 text-primary" />
            <CardTitle>Documentation & Guides</CardTitle>
          </div>
          <CardDescription>
            Explore our comprehensive documentation to learn about all features and capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full sm:w-auto">
            <Book className="mr-2 h-4 w-4" />
            View Documentation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportPage;