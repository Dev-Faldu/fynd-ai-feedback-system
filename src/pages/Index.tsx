import { Header } from "@/components/Header";
import { ReviewForm } from "@/components/ReviewForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 md:py-12">
        <div className="max-w-xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              We Value Your Feedback
            </h1>
            <p className="text-muted-foreground text-lg">
              Help us create better experiences for everyone
            </p>
          </div>

          {/* Review Form */}
          <ReviewForm />

          {/* Trust Indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
              <span>Secure & Anonymous</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-info animate-pulse-soft" />
              <span>AI-Powered Responses</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
