import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import SubjectManager from "./learning/SubjectManager";
import CategoryManager from "./learning/CategoryManager";
import TopicManager from "./learning/TopicManager";
import VideoManager from "./learning/VideoManager";
import QuizManager from "./learning/QuizManager";
import BankManager from "./learning/BankManager";

const LearningContentManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learning Content Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage subjects, categories, topics, videos, quizzes, and quiz banks for the learning platform
        </p>
      </div>

      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="quiz-banks">Quiz Banks</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects">
          <Card className="p-6">
            <SubjectManager />
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="p-6">
            <CategoryManager />
          </Card>
        </TabsContent>

        <TabsContent value="topics">
          <Card className="p-6">
            <TopicManager />
          </Card>
        </TabsContent>

        <TabsContent value="videos">
          <Card className="p-6">
            <VideoManager />
          </Card>
        </TabsContent>

        <TabsContent value="quizzes">
          <Card className="p-6">
            <QuizManager />
          </Card>
        </TabsContent>

        <TabsContent value="quiz-banks">
          <Card className="p-6">
            <BankManager />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LearningContentManagement;
