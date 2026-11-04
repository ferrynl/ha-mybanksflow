import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThumbsUp, Plus, Bug, Lightbulb, Trash2, MessageSquare, Shield } from "lucide-react";
import { toast } from "sonner";
import HelpTooltip from "@/components/HelpTooltip";

interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  vote_count: number;
  user_voted: boolean;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "bg-muted text-muted-foreground" },
  { value: "in_behandeling", label: "In behandeling", color: "bg-primary/15 text-primary" },
  { value: "gepland", label: "Gepland", color: "bg-accent/50 text-accent-foreground" },
  { value: "afgerond", label: "Afgerond", color: "bg-income/15 text-income" },
  { value: "afgewezen", label: "Afgewezen", color: "bg-destructive/15 text-destructive" },
];

export default function FeatureRequestsPage() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("wish");
  const [filter, setFilter] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: requests, error } = await supabase
      .from("feature_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Kon items niet laden");
      setLoading(false);
      return;
    }

    const { data: votes } = await supabase
      .from("feature_request_votes")
      .select("*");

    const allVotes = votes ?? [];
    const mapped: FeatureRequest[] = (requests ?? []).map((r: any) => ({
      ...r,
      vote_count: allVotes.filter((v: any) => v.feature_request_id === r.id).length,
      user_voted: allVotes.some((v: any) => v.feature_request_id === r.id && v.user_id === user.id),
    }));

    mapped.sort((a, b) => b.vote_count - a.vote_count);
    setItems(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("feature_requests").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      type,
    });
    setSaving(false);
    if (error) {
      toast.error("Kon niet opslaan");
      return;
    }
    toast.success("Toegevoegd!");
    setTitle("");
    setDescription("");
    setType("wish");
    setDialogOpen(false);
    fetchItems();
  };

  const handleVote = async (item: FeatureRequest) => {
    if (!user) return;
    if (item.user_voted) {
      await supabase
        .from("feature_request_votes")
        .delete()
        .eq("user_id", user.id)
        .eq("feature_request_id", item.id);
    } else {
      await supabase.from("feature_request_votes").insert({
        user_id: user.id,
        feature_request_id: item.id,
      });
    }
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("feature_requests").delete().eq("id", id);
    toast.success("Verwijderd");
    fetchItems();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("feature_requests").update({ status } as any).eq("id", id);
    toast.success("Status bijgewerkt");
    fetchItems();
  };

  const handleRespond = async (id: string) => {
    if (!responseText.trim()) return;
    await supabase.from("feature_requests").update({ admin_response: responseText.trim() } as any).eq("id", id);
    toast.success("Reactie opgeslagen");
    setRespondingId(null);
    setResponseText("");
    fetchItems();
  };

  const activeItems = showCompleted
    ? items.filter((i) => i.status === "afgerond" || i.status === "afgewezen")
    : items.filter((i) => i.status !== "afgerond" && i.status !== "afgewezen");
  const filtered = filter === "all" ? activeItems : activeItems.filter((i) => i.type === filter);

  const statusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    return (
      <Badge variant="outline" className={`text-xs ${opt?.color ?? ""}`}>
        {opt?.label ?? status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wensen & Bugs</h1>
            <p className="text-sm text-muted-foreground">Deel je ideeën en meld bugs. Stem op wat belangrijk is.</p>
          </div>
          <HelpTooltip
            title="Hoe werkt het?"
            lines={[
              "Dien een wens of bugmelding in via de knop 'Nieuw'",
              "Stem op items die je belangrijk vindt met de duim-omhoog knop",
              "Items worden gesorteerd op populariteit",
              "Je kunt je eigen items verwijderen",
            ]}
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nieuw</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuw item toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wish">💡 Wens</SelectItem>
                  <SelectItem value="bug">🐛 Bug</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Titel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <Textarea
                placeholder="Beschrijving (optioneel)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
              <Button onClick={handleSubmit} disabled={!title.trim() || saving} className="w-full">
                {saving ? "Opslaan..." : "Toevoegen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "Alles" },
          { value: "wish", label: "Wensen" },
          { value: "bug", label: "Bugs" },
        ].map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          variant={showCompleted ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCompleted(!showCompleted)}
        >
          {showCompleted ? "Afgerond" : "Toon afgerond"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nog geen items. Voeg er een toe!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} className="transition-shadow hover:shadow-md">
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleVote(item)}
                    className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      item.user_voted
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span>{item.vote_count}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground/60">#{items.indexOf(item) + 1}</span>
                      <Badge variant={item.type === "bug" ? "destructive" : "secondary"} className="text-xs">
                        {item.type === "bug" ? <><Bug className="h-3 w-3 mr-1" />Bug</> : <><Lightbulb className="h-3 w-3 mr-1" />Wens</>}
                      </Badge>
                      {statusBadge(item.status)}
                    </div>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {item.admin_response && (
                      <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
                          <Shield className="h-3 w-3" /> Reactie beheerder
                        </div>
                        <p className="text-sm text-muted-foreground">{item.admin_response}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {new Date(item.created_at).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <>
                        <Select
                          value={item.status}
                          onValueChange={(v) => handleStatusChange(item.id, v)}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => {
                            setRespondingId(respondingId === item.id ? null : item.id);
                            setResponseText(item.admin_response ?? "");
                          }}
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          title="Reageren"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {(item.user_id === user?.id || isAdmin) && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {respondingId === item.id && isAdmin && (
                  <div className="mt-3 flex gap-2 pl-14">
                    <Textarea
                      placeholder="Schrijf een reactie..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="text-sm"
                      rows={2}
                    />
                    <Button size="sm" onClick={() => handleRespond(item.id)} disabled={!responseText.trim()}>
                      Opslaan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
