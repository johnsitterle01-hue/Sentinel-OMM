import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppShell } from "@/components/AppShell";

import Overview from "@/pages/Overview";
import Markets from "@/pages/Markets";
import Analysis from "@/pages/Analysis";
import Ideas from "@/pages/Ideas";
import News from "@/pages/News";
import Calendar from "@/pages/Calendar";
import Portfolio from "@/pages/Portfolio";
import Alerts from "@/pages/Alerts";
import TelegramSettings from "@/pages/TelegramSettings";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  return (
    <Router hook={useHashLocation}>
      <AppShell>
        <Switch>
          <Route path="/" component={Overview} />
          <Route path="/markets" component={Markets} />
          <Route path="/analysis" component={Analysis} />
          <Route path="/ideas" component={Ideas} />
          <Route path="/news" component={News} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/portfolio" component={Portfolio} />
          <Route path="/alerts" component={Alerts} />
          <Route path="/telegram" component={TelegramSettings} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
