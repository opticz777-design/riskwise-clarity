// Dataset upload and model training page
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { parseCSV, ParseResult } from "@/lib/csvParser";
import { trainModel, TrainingResult } from "@/lib/model";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Brain, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

export default function UploadPage() {
  const { user } = useAuth();
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  // Handle CSV file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSV(text);
      setParseResult(result);
      setTrainingResult(null);
      if (result.success) {
        toast.success(`Loaded ${result.rowCount} rows successfully`);
      } else {
        toast.error(result.error || "Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  }, []);

  // Simulate CNN training with progress animation
  const handleTrain = async () => {
    if (!parseResult?.success || !user) return;
    setIsTraining(true);
    setTrainingProgress(0);

    // Animate training progress
    const interval = setInterval(() => {
      setTrainingProgress((p) => Math.min(p + 4, 95));
    }, 200);

    // Small delay to let UI show loading state
    await new Promise((r) => setTimeout(r, 500));

    // Run training
    const result = trainModel(parseResult.data);
    clearInterval(interval);
    setTrainingProgress(100);

    // Save dataset and model to database
    try {
      const { data: dataset } = await supabase
        .from("datasets")
        .insert({
          user_id: user.id,
          file_name: fileName,
          row_count: parseResult.rowCount,
          column_names: parseResult.columns,
          raw_data: parseResult.data.slice(0, 100) as any, // store first 100 rows
        })
        .select()
        .single();

      if (dataset) {
        await supabase.from("trained_models").insert({
          user_id: user.id,
          dataset_id: dataset.id,
          accuracy: result.accuracy,
          val_accuracy: result.valAccuracy,
          loss_history: result.lossHistory as any,
          confusion_matrix: result.confusionMatrix as any,
          feature_weights: result.featureWeights as any,
        });
      }
    } catch (err) {
      console.error("Error saving model:", err);
    }

    setTrainingResult(result);
    setIsTraining(false);
    toast.success("Model training complete!");
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Dataset & Train Model</h1>
        <p className="text-muted-foreground mt-1">Upload your landslide dataset in CSV format to train the CNN model</p>
      </div>

      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Dataset Upload
          </CardTitle>
          <CardDescription>
            CSV should include: rainfall, slope, soil_type, elevation, ndvi, distance_to_river, landslide_label
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              {fileName ? fileName : "Click to upload CSV file"}
            </span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </CardContent>
      </Card>

      {/* Dataset preview */}
      {parseResult?.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Dataset Preview — {parseResult.rowCount} rows loaded
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Column mapping info */}
            <div className="text-sm space-y-1">
              <p className="font-medium">Mapped Columns:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(parseResult.mappedColumns).map(([from, to]) => (
                  <span key={from} className="px-2 py-1 bg-muted rounded text-xs">
                    {from} → {to}
                  </span>
                ))}
              </div>
            </div>

            {/* Sample data table */}
            <div className="overflow-x-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Rainfall", "Slope", "Soil Type", "Elevation", "NDVI", "Dist. to River", "Label"].map((h) => (
                      <TableHead key={h} className="text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.data.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{row.rainfall.toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{row.slope.toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{row.soil_type}</TableCell>
                      <TableCell className="text-xs">{row.elevation.toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{row.ndvi.toFixed(3)}</TableCell>
                      <TableCell className="text-xs">{row.distance_to_river.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{row.landslide_label}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Train button */}
            <div className="pt-2">
              {isTraining ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary animate-pulse" />
                    <span className="text-sm font-medium">Training CNN model...</span>
                    <span className="text-sm text-muted-foreground">{trainingProgress}%</span>
                  </div>
                  <Progress value={trainingProgress} className="animate-pulse-glow" />
                </div>
              ) : (
                <Button onClick={handleTrain} size="lg">
                  <Brain className="mr-2 h-5 w-5" />
                  Train CNN Model
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {parseResult && !parseResult.success && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>{parseResult.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Training results */}
      {trainingResult && (
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Training Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">{(trainingResult.accuracy * 100).toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Validation Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-success">{(trainingResult.valAccuracy * 100).toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Loss chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Training & Validation Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trainingResult.lossHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" label={{ value: "Epoch", position: "bottom" }} />
                  <YAxis label={{ value: "Loss", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="loss" stroke="hsl(210, 70%, 35%)" name="Training Loss" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="valLoss" stroke="hsl(15, 85%, 55%)" name="Validation Loss" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Confusion matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confusion Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-1 max-w-xs text-center text-sm">
                <div />
                <div className="font-medium p-2">Predicted 0</div>
                <div className="font-medium p-2">Predicted 1</div>
                <div className="font-medium p-2">Actual 0</div>
                <div className="p-3 bg-success/10 rounded font-bold">{trainingResult.confusionMatrix.tn}</div>
                <div className="p-3 bg-destructive/10 rounded font-bold">{trainingResult.confusionMatrix.fp}</div>
                <div className="font-medium p-2">Actual 1</div>
                <div className="p-3 bg-destructive/10 rounded font-bold">{trainingResult.confusionMatrix.fn}</div>
                <div className="p-3 bg-success/10 rounded font-bold">{trainingResult.confusionMatrix.tp}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
