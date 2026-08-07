"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Sparkles,
  Info,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "alert" | "ai" | "evidence" | "system";
  href?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "CDR Correlation Alert",
    description: "High-priority phone number match identified across Case #CR-8921 and #CR-7740.",
    time: "5m ago",
    read: false,
    type: "alert",
    href: "/cases",
  },
  {
    id: "notif-2",
    title: "OSINT AI Synthesis Ready",
    description: "Target handle @shadow_net social graph and darknet footprint analysis finished.",
    time: "22m ago",
    read: false,
    type: "ai",
    href: "/cases",
  },
  {
    id: "notif-3",
    title: "Evidence Ingested",
    description: "3 CCTV video streams and 14 PDF reports uploaded and hashed into Evidence Vault.",
    time: "1h ago",
    read: false,
    type: "evidence",
    href: "/cases",
  },
  {
    id: "notif-4",
    title: "Chain of Custody Audit",
    description: "System integrity check completed. All cryptographic hashes verified clean.",
    time: "3h ago",
    read: true,
    type: "system",
  },
  {
    id: "notif-5",
    title: "Tactical Priority Updated",
    description: "Case #CR-8921 escalated to Urgent Response status by Chief Investigator.",
    time: "5h ago",
    read: true,
    type: "alert",
    href: "/cases",
  },
];

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread" | "alert">("all");
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    if (notif.href) {
      setOpen(false);
      router.push(notif.href);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "alert") return n.type === "alert";
    return true;
  });

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "alert":
        return <ShieldAlert className="h-4 w-4 text-primary" />;
      case "ai":
        return <Sparkles className="h-4 w-4 text-info" />;
      case "evidence":
        return <FileText className="h-4 w-4 text-success" />;
      case "system":
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        className={`h-9 w-9 rounded-squircle-sm border-border bg-background transition-colors text-muted-foreground relative ${
          open ? "bg-secondary text-foreground border-primary/50" : "hover:bg-secondary hover:text-foreground"
        }`}
        aria-label="System status alerts"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
        )}
      </Button>

      {/* Popover Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-squircle border border-border bg-card shadow-2xl z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Tactical Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-primary/20 text-primary border border-primary/30">
                  {unreadCount} NEW
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Close notifications"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border/60 bg-background/50 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-squircle-sm text-[11px] font-medium transition-colors ${
                filter === "all"
                  ? "bg-primary/15 text-accent-strong border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-2.5 py-1 rounded-squircle-sm text-[11px] font-medium transition-colors ${
                filter === "unread"
                  ? "bg-primary/15 text-accent-strong border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("alert")}
              className={`px-2.5 py-1 rounded-squircle-sm text-[11px] font-medium transition-colors ${
                filter === "alert"
                  ? "bg-primary/15 text-accent-strong border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Alerts ({notifications.filter((n) => n.type === "alert").length})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-border/50 workspace-scroll">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-medium text-muted-foreground">
                  No notifications in this view
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 transition-colors cursor-pointer group flex items-start gap-3 relative ${
                    !notif.read
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-secondary/60"
                  }`}
                >
                  {/* Status dot / indicator */}
                  <div className="mt-0.5 shrink-0 flex items-center justify-center p-1.5 rounded-squircle-sm bg-background border border-border">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !notif.read ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {notif.time}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {notif.description}
                    </p>
                  </div>

                  {/* Single action dismiss button on hover */}
                  <button
                    type="button"
                    onClick={(e) => removeNotification(notif.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-danger rounded"
                    title="Dismiss"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                  {!notif.read && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-sidebar flex items-center justify-between text-xs">
              <span className="text-[10px] font-mono text-muted-foreground">
                Crime OS Realtime Ingest
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] text-muted-foreground hover:text-danger transition-colors font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
