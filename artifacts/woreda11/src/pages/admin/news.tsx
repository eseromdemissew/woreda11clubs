import React from "react";
import { motion } from "framer-motion";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useListNews, useCreateNews, useUpdateNews, useDeleteNews, getListNewsQueryKey, type NewsItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Newspaper, Eye, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function AdminNews() {
  const qc = useQueryClient();
  const queryKey = getListNewsQueryKey();
  const { data: newsItems = [], isLoading } = useListNews({ query: { queryKey } });
  const createMutation = useCreateNews();
  const updateMutation = useUpdateNews();
  const deleteMutation = useDeleteNews();

  const [modal, setModal] = React.useState<{ mode: "create" | "edit"; item?: NewsItem } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<NewsItem | null>(null);
  const [form, setForm] = React.useState({ title: "", description: "", imageUrl: "" });
  const charLimit = 120;

  const openCreate = () => { setForm({ title: "", description: "", imageUrl: "" }); setModal({ mode: "create" }); };
  const openEdit = (item: NewsItem) => { setForm({ title: item.title, description: item.description, imageUrl: item.imageUrl ?? "" }); setModal({ mode: "edit", item }); };

  const handleSave = () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    const payload = { title: form.title, description: form.description, imageUrl: form.imageUrl || undefined };
    if (modal?.mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { toast.success("News published"); qc.invalidateQueries({ queryKey }); setModal(null); },
        onError: () => toast.error("Failed to publish"),
      });
    } else if (modal?.mode === "edit" && modal.item) {
      updateMutation.mutate({ id: modal.item.id, data: payload }, {
        onSuccess: () => { toast.success("News updated"); qc.invalidateQueries({ queryKey }); setModal(null); },
        onError: () => toast.error("Failed to update"),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id }, {
      onSuccess: () => { toast.success("News deleted"); qc.invalidateQueries({ queryKey }); setDeleteTarget(null); },
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <ProtectedLayout allowedRole="admin">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">News & Updates</h1>
            <p className="text-muted-foreground mt-1">Manage announcements for all clubs</p>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Post</Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : newsItems.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-muted-foreground border border-dashed rounded-xl">
            <Newspaper className="w-12 h-12 mb-4 opacity-25" />
            <p className="font-medium">No news yet</p>
            <p className="text-sm mt-1">Post your first announcement</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {newsItems.map(item => (
              <motion.div key={item.id} whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="overflow-hidden h-full">
                  {item.imageUrl && (
                    <div className="h-40 overflow-hidden bg-muted">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-base leading-snug line-clamp-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.publishedAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.readCount} read{item.readCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-8 w-8 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{modal?.mode === "create" ? "New Post" : "Edit Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-medium">Title</label>
                <span className={`text-xs ${form.title.length > charLimit ? "text-destructive" : "text-muted-foreground"}`}>{form.title.length}/{charLimit}</span>
              </div>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={charLimit + 10} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Image URL (optional)</label>
              <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
              {form.imageUrl && <img src={form.imageUrl} alt="preview" className="mt-2 rounded-lg h-32 w-full object-cover bg-muted" onError={e => e.currentTarget.style.display = "none"} />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {modal?.mode === "create" ? "Publish" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete News Post</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deleteTarget?.title}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedLayout>
  );
}
