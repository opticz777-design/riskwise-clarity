// Prediction page with risk assessment form and SHAP explanation
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { predictRisk, PredictionResult } from "@/lib/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mountain, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SOIL_TYPES = [
  { value: "0", label: "Gravel" },
  { value: "1", label: "Sand" },
  { value: "2", label: "Silt" },
  { value: "3", label: "Clay" },
];

export default function PredictPage() {
  const { user } = useAuth();
  const [featureWeights, setFeatureWeights] = useState<Record<string, number> | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [rainfall, setRainfall] = useState("150");
  const [slope, setSlope] = useState("30");
  const [soilType, setSoilType] = useState("1");
  const [elevation, setElevation] = useState("500");
  const [ndvi, setNdvi] = useState("0.4");
  const [distanceToRiver, setDistanceToRiver] = useState("2.5");

  // Load latest trained model weights
  useEffect(() => {
    if (!user) return;
    supabase
      .from("trained_models")
      .select("feature_weights")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.feature_weights) {
          setFeatureWeights(data.feature_weights as Record<string, number>);
        }
      });
  }, [user]);

  const handlePredict = async () => {
    const weights = featureWeights || {
      rainfall: 0.7, slope: 0.6, soil_type: 0.3, elevation: 0.4, ndvi: -0.5, distance_to_river: -0.4,
    };

    const input = {
      rainfall: parseFloat(rainfall),
      slope: parseFloat(slope),
      soil_type: parseInt(soilType),
      elevation: parseFloat(elevation),
      ndvi: parseFloat(ndvi),
      distance_to_river: parseFloat(distanceToRiver),
    };

    // Validate inputs
    if (Object.values(input).some(isNaN)) {
      toast.error("Please fill in all fields with valid numbers");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800)); // simulate computation

    const result = predictRisk(input, weights);
    setPrediction(result);

    // Save prediction to database
    if (user) {
      const latestModel = await supabase
        .from("trained_models")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      await supabase.from("predictions").insert({
        user_id: user.id,
        model_id: latestModel.data?.id || null,
        input_data: input as any,
        risk_level: result.riskLevel,
        probability: result.probability,
        feature_importance: result.featureImportance as any,
      });
    }

    setLoading(false);
    toast.success("Prediction complete!");
  };

  // Risk level styling
  const riskColor = prediction?.riskLevel === "High Risk" ? "text-risk-high" : prediction?.riskLevel === "Medium Risk" ? "text-risk-medium" : "text-risk-low";
  const riskBg = prediction?.riskLevel === "High Risk" ? "bg-risk-high/10 border-risk-high/30" : prediction?.riskLevel === "Medium Risk" ? "bg-risk-medium/10 border-risk-medium/30" : "bg-risk-low/10 border-risk-low/30";

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Predict Landslide Risk</h1>
        <p className="text-muted-foreground mt-1">Enter geospatial parameters to assess landslide probability</p>
      </div>

      {!featureWeights && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6 flex items-center gap-3 text-sm">
            <Info className="h-5 w-5 text-warning shrink-0" />
            <p>No trained model found. Using default weights. Upload a dataset and train a model for better accuracy.</p>
          </CardContent>
        </Card>
      )}

      {/* Prediction form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-primary" />
            Input Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Rainfall (mm)</Label>
              <Input type="number" value={rainfall} onChange={(e) => setRainfall(e.target.value)} placeholder="e.g. 150" />
            </div>
            <div className="space-y-2">
              <Label>Slope (degrees)</Label>
              <Input type="number" value={slope} onChange={(e) => setSlope(e.target.value)} placeholder="e.g. 30" />
            </div>
            <div className="space-y-2">
              <Label>Soil Type</Label>
              <Select value={soilType} onValueChange={setSoilType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOIL_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Elevation (meters)</Label>
              <Input type="number" value={elevation} onChange={(e) => setElevation(e.target.value)} placeholder="e.g. 500" />
            </div>
            <div className="space-y-2">
              <Label>NDVI Index</Label>
              <Input type="number" step="0.01" value={ndvi} onChange={(e) => setNdvi(e.target.value)} placeholder="e.g. 0.4" />
            </div>
            <div className="space-y-2">
              <Label>Distance to River (km)</Label>
              <Input type="number" step="0.1" value={distanceToRiver} onChange={(e) => setDistanceToRiver(e.target.value)} placeholder="e.g. 2.5" />
            </div>
          </div>
          <Button onClick={handlePredict} className="mt-6" size="lg" disabled={loading}>
            {loading ? "Computing..." : "Predict Risk"}
          </Button>
        </CardContent>
      </Card>

      {/* Prediction result */}
      {prediction && (
        <div className="space-y-4">
          {/* Risk level card */}
          <Card className={`border ${riskBg}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {prediction.riskLevel === "High Risk" ? (
                    <AlertTriangle className={`h-8 w-8 ${riskColor}`} />
                  ) : (
                    <CheckCircle2 className={`h-8 w-8 ${riskColor}`} />
                  )}
                  <div>
                    <p className={`text-2xl font-bold ${riskColor}`}>{prediction.riskLevel}</p>
                    <p className="text-sm text-muted-foreground">Probability: {(prediction.probability * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SHAP Feature Importance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SHAP Feature Importance</CardTitle>
              <CardDescription>Feature contributions to the prediction (red = increases risk, blue = decreases risk)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prediction.featureImportance} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="feature" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="SHAP Value">
                    {prediction.featureImportance.map((entry, idx) => (
                      <Cell key={idx} fill={entry.value >= 0 ? "hsl(0, 72%, 55%)" : "hsl(210, 70%, 55%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Explanation text */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Explanation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>The prediction is mainly influenced by:</p>
              <ol className="list-decimal pl-5 space-y-1">
                {prediction.featureImportance.slice(0, 3).map((f, i) => (
                  <li key={i}>
                    <strong>{f.feature}</strong> (contribution: {f.value > 0 ? "+" : ""}{f.value.toFixed(4)}) —{" "}
                    {f.value > 0 ? "increases" : "decreases"} landslide risk
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
