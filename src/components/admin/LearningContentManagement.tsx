import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import CategoryManager from "./learning/CategoryManager";
import TopicManager from "./learning/TopicManager";
import VideoManager from "./learning/VideoManager";
import QuizManager from "./learning/QuizManager";
import BankManager from "./learning/BankManager";
import { PageMeta } from "@/components/seo/PageMeta";

const LearningContentManagement = () => {
  const ui = useInterfaceTranslation();
  return (
    <div className="space-y-6">
      <PageMeta title={ui("Learning Content")} description={ui("Manage videos, topics, and quiz content.")} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{ui("Learning Content Management")}</h1>
        <p className="text-muted-foreground mt-2">
          {ui("Manage categories, topics, videos, quizzes, and quiz banks for the learning platform.")}
          <br />
          <span className="text-sm text-muted-foreground">
            {ui("Note: Subjects are managed in")} <a href="/admin/subjects" className="text-primary hover:underline">{ui("Subject Management")}</a> {ui("under the \"Learning Platform Subjects\" tab.")}
          </span>
        </p>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="categories">{ui("Categories")}</TabsTrigger>
          <TabsTrigger value="topics">{ui("Topics")}</TabsTrigger>
          <TabsTrigger value="videos">{ui("Videos")}</TabsTrigger>
          <TabsTrigger value="quizzes">{ui("Quizzes")}</TabsTrigger>
          <TabsTrigger value="quiz-banks">{ui("Quiz Banks")}</TabsTrigger>
        </TabsList>

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
