import React from "react";
import { motion } from "framer-motion";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useListNews, useMarkNewsRead, getListNewsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Calendar, Eye } from "lucide-react";

export default function ManagerNews() {
  const qc = useQueryClient();
  const queryKey = getListNewsQueryKey();
  const { data: newsItems = [], isLoading } = useListNews({ query: { queryKey } });
  const markReadMutation = useMarkNewsRead();

  const [selected, setSelected] = React.useState<typeof newsItems[0] | null>(null);

  const unreadCount = newsItems.filter(n => !n.isRead).length;

  const handleOpen = (item: typeof newsItems[0]) => {
    setSelected(item);
    if (!item.isRead) {
      markReadMutation.mutate({ id: item.id }, {
        onSuccess: () => qc.invalidateQueries({ queryKey }),
      });
    }
  };

  return (
    <ProtectedLayout allowedRole="manager">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">News & Announcements</h1>
            <p className="text-muted-foreground mt-1">Latest updates from Woreda 11</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">{unreadCount} unread</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : newsItems.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-muted-foreground border border-dashed rounded-xl">
            <Newspaper className="w-12 h-12 mb-4 opacity-25" />
            <p className="font-medium">No announcements yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {newsItems.map(item => (
              <motion.div
                key={item.id}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
                onClick={() => handleOpen(item)}
                className="cursor-pointer"
              >
                <Card className={`overflow-hidden h-full transition-shadow hover:shadow-md ${!item.isRead ? "border-primary/30" : ""}`}>
                  {item.imageUrl && (
                    <div className="h-36 overflow-hidden bg-muted">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      {!item.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                      <h3 className={`text-base leading-snug line-clamp-2 ${!item.isRead ? "font-bold" : "font-medium"}`}>{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.publishedAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.readCount} read{item.readCount !== 1 ? "s" : ""}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl leading-snug pr-4">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selected.imageUrl && (
                  <div className="rounded-lg overflow-hidden">
                    <img src={selected.imageUrl} alt={selected.title} className="w-full h-56 object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(selected.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                  {selected.publishedByName && <span>by {selected.publishedByName}</span>}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.description}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
