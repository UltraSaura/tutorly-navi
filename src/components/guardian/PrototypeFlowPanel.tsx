import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const prototypeFlows = [
  { label: "Kids List", path: "/guardian/children" },
  { label: "Amina – Dashboard", path: "/guardian/child/1" },
  { label: "Amina – Math", path: "/guardian/child/1/subject/math" },
  { label: "Yanis – Dashboard", path: "/guardian/child/2" },
];

export function PrototypeFlowPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <Card className={`fixed z-50 bg-card/95 backdrop-blur-md shadow-lg ${
      isMobile 
        ? "bottom-20 right-4 w-48" 
        : "top-20 right-6 w-56"
    }`}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer border-b border-border"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-xs font-semibold text-muted-foreground">PROTOTYPE FLOW</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      {isExpanded && (
        <div className="p-2 space-y-1">
          {prototypeFlows.map((flow) => (
            <Button
              key={flow.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(flow.path)}
              className="w-full justify-start text-xs h-8 text-foreground hover:bg-accent"
            >
              {flow.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
