/**
 * Onboarding Overlay - Guide new users through the builder
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Wrench,
  Play,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MousePointer2,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  highlight: "left" | "center" | "right";
  tip?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to AgentForge Builder!",
    description: "Build powerful AI agents in minutes. No coding required. Let's take a quick tour.",
    icon: Sparkles,
    highlight: "center",
  },
  {
    id: "templates",
    title: "1. Choose a Template",
    description: "Start with a pre-built AI employee template. Each comes with the right tools and personality for the job.",
    icon: Users,
    highlight: "left",
    tip: "Click any template to instantly load it",
  },
  {
    id: "tools",
    title: "2. Customize Tools",
    description: "Add or remove tools by dragging them to the drop zone. Use Quick Add bundles for common tool combinations.",
    icon: Wrench,
    highlight: "center",
    tip: "Drag tools or click the + button to add them",
  },
  {
    id: "test",
    title: "3. Test Your Agent",
    description: "Run quick tests to verify your agent works correctly. All tests should pass before deploying.",
    icon: Play,
    highlight: "right",
    tip: "Use Quick Test for automated testing",
  },
  {
    id: "deploy",
    title: "4. Deploy Anywhere",
    description: "Export your agent as code, deploy as an API, or download the desktop app to run locally.",
    icon: Rocket,
    highlight: "right",
    tip: "Multiple deployment options available",
  },
];

interface OnboardingOverlayProps {
  onComplete: () => void;
  isFirstVisit?: boolean;
}

export function OnboardingOverlay({ onComplete, isFirstVisit = true }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(isFirstVisit);

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsOpen(false);
    // Save to localStorage so we don't show again
    localStorage.setItem("agentforge-onboarding-complete", "true");
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) return null;

  const StepIcon = step.icon;

  return (
    <>
      {/* Backdrop with highlight zones */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
        {/* Highlight panel indicator */}
        <AnimatePresence mode="wait">
          {step.highlight !== "center" && currentStep > 0 && (
            <motion.div
              key={step.highlight}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute top-16 bottom-0 border-4 border-primary rounded-lg",
                step.highlight === "left" && "left-0 w-[25%]",
                step.highlight === "right" && "right-0 w-[40%]"
              )}
              style={{
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md z-[60]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Skip tour</span>
          </button>

          <DialogHeader className="text-center sm:text-center">
            <motion.div
              key={step.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
            >
              <StepIcon className="w-8 h-8 text-primary" />
            </motion.div>

            <DialogTitle className="text-xl">{step.title}</DialogTitle>
            <DialogDescription className="text-base mt-2">
              {step.description}
            </DialogDescription>
          </DialogHeader>

          {step.tip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mt-2"
            >
              <MousePointer2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{step.tip}</span>
            </motion.div>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-4">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep
                    ? "bg-primary w-6"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="text-xs text-muted-foreground">
              {currentStep + 1} of {onboardingSteps.length}
            </div>

            <Button onClick={handleNext} className="gap-1">
              {isLastStep ? (
                <>
                  Get Started
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Hook to check if user has completed onboarding
 */
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("agentforge-onboarding-complete");
    setShowOnboarding(!completed);
    setIsLoaded(true);
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem("agentforge-onboarding-complete");
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isLoaded,
    completeOnboarding: () => setShowOnboarding(false),
    resetOnboarding,
  };
}
