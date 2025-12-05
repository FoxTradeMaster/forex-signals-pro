import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import Dashboard from "./pages/Dashboard";
import Premium from "./pages/Premium";
import PremiumSuccess from "./pages/PremiumSuccess";
import ActivateAccount from "./pages/ActivateAccount";
import VerifyMagicLink from "./pages/VerifyMagicLink";
import Admin from "./pages/Admin";
import SignalHistory from "./pages/SignalHistory";
import AlertSettings from "./pages/AlertSettings";
import TradeJournal from "./pages/TradeJournal";
import Analytics from "./pages/Analytics";
import ShareSignal from "./pages/ShareSignal";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path="/premium" component={Premium} />
      <Route path="/premium/success" component={PremiumSuccess} />
      <Route path="/activate" component={ActivateAccount} />
      <Route path="/auth/verify" component={VerifyMagicLink} />
      <Route path="/admin" component={Admin} />
      <Route path="/history" component={SignalHistory} />
      <Route path="/settings/alerts" component={AlertSettings} />
      <Route path="/journal" component={TradeJournal} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/share/:shareId" component={ShareSignal} />
      <Route path={"/404"} component={NotFound} />      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
