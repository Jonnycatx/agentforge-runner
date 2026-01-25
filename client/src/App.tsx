import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Landing from "@/pages/landing";
import Builder from "@/pages/builder";
import Gallery from "@/pages/gallery";
import Tools from "@/pages/tools";
import Employees from "@/pages/employees";
import SmartBuilder from "@/pages/smart-builder";
import UnifiedBuilder from "@/pages/unified-builder";
import RunAgent from "@/pages/run-agent";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/builder" component={UnifiedBuilder} />
      <Route path="/builder-classic" component={Builder} />
      <Route path="/smart-builder" component={SmartBuilder} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/tools" component={Tools} />
      <Route path="/employees" component={Employees} />
      <Route path="/run-agent/:agentId?" component={RunAgent} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="agentforge-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
