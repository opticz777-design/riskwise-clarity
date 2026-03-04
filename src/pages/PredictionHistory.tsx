// Prediction history page - view and delete past predictions
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { History, Trash2, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";

interface PredictionRow {
  id: string;
  created_at: string;
  input_data: Record<string, number>;
  risk_level: string;
  probability: number;
  feature_importance: { feature: string; value: number }[] | null;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPredictions((data as unknown as PredictionRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPredictions();
  }, [user]);

  const handleDelete = async (id: string) => {
    await supabase.from("predictions").delete().eq("id", id);
    setPredictions((prev) => prev.filter((p) => p.id !== id));
    toast.success("Prediction deleted");
  };

  const riskBadge = (level: string) => {
    const colors = {
      "Low Risk": "bg-risk-low/10 text-risk-low",
      "Medium Risk": "bg-risk-medium/10 text-risk-medium",
      "High Risk": "bg-risk-high/10 text-risk-high",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level as keyof typeof colors] || ""}`}>
        {level}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prediction History</h1>
        <p className="text-muted-foreground mt-1">View and manage your past landslide risk assessments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Past Predictions ({predictions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : predictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No predictions yet. Go to Predict Risk to make your first assessment.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Rainfall</TableHead>
                    <TableHead>Slope</TableHead>
                    <TableHead>Elevation</TableHead>
                    <TableHead>NDVI</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{format(new Date(p.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell>{p.input_data?.rainfall?.toFixed(0)}</TableCell>
                      <TableCell>{p.input_data?.slope?.toFixed(1)}°</TableCell>
                      <TableCell>{p.input_data?.elevation?.toFixed(0)}m</TableCell>
                      <TableCell>{p.input_data?.ndvi?.toFixed(2)}</TableCell>
                      <TableCell>{riskBadge(p.risk_level)}</TableCell>
                      <TableCell>{(p.probability * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* View details dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Prediction Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {p.input_data && Object.entries(p.input_data).map(([k, v]) => (
                                    <div key={k}>
                                      <span className="text-muted-foreground">{k.replace(/_/g, " ")}:</span>{" "}
                                      <span className="font-medium">{typeof v === 'number' ? v.toFixed(2) : v}</span>
                                    </div>
                                  ))}
                                </div>
                                {p.feature_importance && (
                                  <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={p.feature_importance as any} layout="vertical" margin={{ left: 100 }}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis type="number" />
                                      <YAxis type="category" dataKey="feature" width={90} tick={{ fontSize: 11 }} />
                                      <Tooltip />
                                      <Bar dataKey="value" name="SHAP">
                                        {(p.feature_importance as any).map((entry: any, idx: number) => (
                                          <Cell key={idx} fill={entry.value >= 0 ? "hsl(0, 72%, 55%)" : "hsl(210, 70%, 55%)"} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
