import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, TrendingUp, Code, BarChart3, CheckCircle2 } from "lucide-react";

const Index = () => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/python-backtesting-guide.pdf';
    link.download = 'python-backtesting-guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const features = [
    {
      icon: <Code className="w-6 h-6" />,
      title: "Python-Powered",
      description: "Learn industry-standard Python libraries for backtesting"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Data Analysis",
      description: "Master data manipulation and visualization techniques"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Strategy Testing",
      description: "Validate your trading strategies with historical data"
    }
  ];

  const benefits = [
    "Step-by-step implementation guide",
    "Real-world trading examples",
    "Performance metrics and optimization",
    "Risk management techniques",
    "Best practices and common pitfalls"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium border border-accent/20">
              <Download className="w-4 h-4" />
              Free Guide Available
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Master Python Backtesting for{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Trading Strategies
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Download our comprehensive guide and learn how to validate your trading strategies using Python. 
            Perfect for quantitative traders and developers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              onClick={handleDownload}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Free Guide
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="p-6 bg-card border-border hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What's Inside Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 sm:p-12 bg-card border-border">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-card-foreground mb-4">
                  What's Inside the Guide
                </h2>
                <p className="text-muted-foreground mb-6">
                  Everything you need to start backtesting your trading strategies with confidence.
                </p>
                <ul className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-card-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 border border-accent/20">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
                    <Download className="w-10 h-10 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    Ready to Start?
                  </h3>
                  <p className="text-muted-foreground">
                    Get instant access to the complete guide
                  </p>
                  <Button 
                    onClick={handleDownload}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    size="lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Now
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-border mt-16">
        <div className="text-center text-muted-foreground">
          <p>© 2024 Python Backtesting Guide. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
