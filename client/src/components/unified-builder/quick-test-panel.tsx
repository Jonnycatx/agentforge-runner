/**
 * Quick Test Panel - One-click testing with predefined scenarios
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Zap,
  RotateCcw,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { generateTestScenarios, type TestScenario } from "./test-scenarios";

interface QuickTestPanelProps {
  tools: string[];
  onRunTest: (prompt: string) => Promise<{ success: boolean; response: string; error?: string }>;
  isConnected: boolean;
}

interface TestResult {
  scenarioId: string;
  status: "pending" | "running" | "passed" | "failed";
  response?: string;
  error?: string;
  duration?: number;
}

export function QuickTestPanel({ tools, onRunTest, isConnected }: QuickTestPanelProps) {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);

  const scenarios = generateTestScenarios(tools);

  // Count results
  const passedCount = Object.values(testResults).filter(r => r.status === "passed").length;
  const failedCount = Object.values(testResults).filter(r => r.status === "failed").length;
  const totalRun = passedCount + failedCount;
  const progress = scenarios.length > 0 ? (totalRun / scenarios.length) * 100 : 0;

  // Run a single test
  const runSingleTest = async (scenario: TestScenario) => {
    if (!isConnected) return;

    setCurrentTest(scenario.id);
    setTestResults(prev => ({
      ...prev,
      [scenario.id]: { scenarioId: scenario.id, status: "running" },
    }));

    const startTime = Date.now();

    try {
      const result = await onRunTest(scenario.prompt);
      const duration = Date.now() - startTime;

      setTestResults(prev => ({
        ...prev,
        [scenario.id]: {
          scenarioId: scenario.id,
          status: result.success ? "passed" : "failed",
          response: result.response,
          error: result.error,
          duration,
        },
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [scenario.id]: {
          scenarioId: scenario.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Test failed",
          duration: Date.now() - startTime,
        },
      }));
    }

    setCurrentTest(null);
  };

  // Run all tests
  const runAllTests = async () => {
    if (!isConnected) return;

    setIsRunningAll(true);
    setTestResults({});

    for (const scenario of scenarios) {
      await runSingleTest(scenario);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunningAll(false);
  };

  // Reset all tests
  const resetTests = () => {
    setTestResults({});
    setCurrentTest(null);
  };

  // Get status icon
  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "passed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Quick Tests</span>
          {totalRun > 0 && (
            <Badge
              variant={failedCount > 0 ? "destructive" : "default"}
              className="text-xs"
            >
              {passedCount}/{scenarios.length} passed
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalRun > 0 && (
            <Button variant="ghost" size="sm" onClick={resetTests}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={runAllTests}
            disabled={isRunningAll || !isConnected || scenarios.length === 0}
          >
            {isRunningAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {isRunningAll && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Running test {totalRun + 1} of {scenarios.length}...
          </p>
        </div>
      )}

      {/* Not connected warning */}
      {!isConnected && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-700 dark:text-amber-300">
            Connect an AI model to run tests
          </span>
        </div>
      )}

      {/* Test scenarios */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {scenarios.map((scenario, index) => {
            const result = testResults[scenario.id];
            const isRunning = currentTest === scenario.id;

            return (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    "transition-all",
                    isRunning && "ring-2 ring-primary",
                    result?.status === "passed" && "border-green-500/30 bg-green-500/5",
                    result?.status === "failed" && "border-red-500/30 bg-red-500/5"
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {result ? getStatusIcon(result.status) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {scenario.description}
                          </span>
                          {result?.duration && (
                            <Badge variant="outline" className="text-[10px]">
                              {(result.duration / 1000).toFixed(1)}s
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          "{scenario.prompt}"
                        </p>

                        {/* Show response/error on completion */}
                        {result?.status === "passed" && result.response && (
                          <div className="mt-2 p-2 rounded bg-green-500/10 text-xs text-green-700 dark:text-green-300 line-clamp-2">
                            {result.response.slice(0, 150)}...
                          </div>
                        )}
                        {result?.status === "failed" && result.error && (
                          <div className="mt-2 p-2 rounded bg-red-500/10 text-xs text-red-700 dark:text-red-300">
                            {result.error}
                          </div>
                        )}
                      </div>

                      {!isRunningAll && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => runSingleTest(scenario)}
                              disabled={isRunning || !isConnected}
                            >
                              {isRunning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Run this test</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Summary */}
      {totalRun === scenarios.length && totalRun > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-4 rounded-lg text-center",
            failedCount === 0 
              ? "bg-green-500/10 border border-green-500/30" 
              : "bg-amber-500/10 border border-amber-500/30"
          )}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {failedCount === 0 ? (
              <>
                <Sparkles className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  All Tests Passed!
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  {failedCount} test{failedCount > 1 ? "s" : ""} failed
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {failedCount === 0 
              ? "Your agent is ready to deploy!" 
              : "Review failed tests and try again"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
