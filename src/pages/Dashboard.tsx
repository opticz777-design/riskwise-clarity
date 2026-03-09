// Dashboard home page with system overview
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain, Database, Brain, History, Shield } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { icon: Database, label: "Upload Dataset", description: "Upload CSV data for training", color: "text-primary", url: "/upload" },
    { icon: Brain, label: "Train Model", description: "Train CNN on your data", color: "text-accent", url: "/upload" },
    { icon: Mountain, label: "Predict Risk", description: "Assess landslide probability", color: "text-success", url: "/predict" },
    { icon: History, label: "View History", description: "Past predictions & results", color: "text-secondary", url: "/history" },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Explainable Landslide Risk Assessment System (CNN + SHAP)
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, description, color, url }) => (
          <Card
            key={label}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(url)}
          >
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className={`p-2 rounded-lg bg-muted ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System info card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>This system uses a <strong>Convolutional Neural Network (CNN)</strong> to assess landslide risk based on geospatial and environmental features.</p>
          <p><strong>SHAP (SHapley Additive exPlanations)</strong> provides interpretable explanations for each prediction, highlighting which factors contribute most to the assessed risk level.</p>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-risk-low" />
              <span>Low Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-risk-medium" />
              <span>Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-risk-high" />
              <span>High Risk</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
