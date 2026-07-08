import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import "./index.css";

export function render(url: string) {
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <TooltipProvider>
          <LandingPage />
        </TooltipProvider>
      </StaticRouter>
    </StrictMode>
  );
  return html;
}
