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
import { interpolate, useLanguage, type TranslationKey } from "@/lib/language-context";

export interface NotificationItem {
  id: string;
  /** Dictionary-key suffix under `notifications.seed.*`. */
  titleKey: string;
  descKey: string;
  time: string;
  read: boolean;
  type: "alert" | "ai" | "evidence" | "system";
  href?: string;
}

// Demo feed. Keyed rather than hardcoded so the popover follows the selected
// language like every other surface (Phase 14C).
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    titleKey: "cdr_title",
    descKey: "cdr_desc",
    time: "5m ago",
    read: false,
    type: "alert",
    href: "/cases",
  },
  {
    id: "notif-2",
    titleKey: "osint_title",
    descKey: "osint_desc",
    time: "22m ago",
    read: false,
    type: "ai",
    href: "/cases",
  },
  {
    id: "notif-3",
    titleKey: "evidence_title",
    descKey: "evidence_desc",
    time: "1h ago",
    read: false,
    type: "evidence",
    href: "/cases",
  },
  {
    id: "notif-4",
    titleKey: "custody_title",
    descKey: "custody_desc",
    time: "3h ago",
    read: true,
    type: "system",
  },
  {
    id: "notif-5",
    titleKey: "priority_title",
    descKey: "priority_desc",
    time: "5h ago",
    read: true,
    type: "alert",
    href: "/cases",
  },
];

export function NotificationsPopover() {
  const { t } = useLanguage();
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
        className={`h-9 w-9 rounded-squircle-sm border-border bg-background transition-colors text-muted-foreground relative ${ open ? "bg-secondary text-foreground border-primary/50" : "hover:bg-secondary hover:text-foreground"
        }`}
        aria-label={t("notifications.bell_label")}
        title={t("notifications.title")}
      >
        <Bell className="h-4 w-4" />
        {/* Unread notifications are an attention marker, which is Warning Amber
            in this palette. Red here competed with the rail's active-route mark
            and the page's primary action on every screen. */}
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warn" />
        )}
      </Button>

      {/* Popover Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-squircle border border-border bg-card elev-overlay z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {t("notifications.title")}
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-primary/20 text-primary border border-primary/30">
                  {interpolate(t("notifications.new_badge"), { count: unreadCount })}
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
                  title={t("notifications.mark_all_read")}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("notifications.mark_read")}</span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label={t("notifications.close")}
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
              className={`px-2.5 py-1 rounded-squircle-sm text-[11px] font-medium transition-colors ${ filter === "all"
                  ? "bg-primary/15 text-accent-strong border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t("notifications.filter_all")} ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-2.5 py-1 rounded-squircle-sm text-[11px] font-medium transition-colors ${ filter === "unread"
                  ? "bg-primary/15 text-accent-strong border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t("notifications.filter_unread")} ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("alert")}
              className={`px-2.5 py-1 rounded-squircle-sm text-[11px] font-medium transition-colors ${ filter === "alert"
                  ? "bg-primary/15 text-accent-strong border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t("notifications.filter_alerts")} (
              {notifications.filter((n) => n.type === "alert").length})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-border/50 workspace-scroll">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-medium text-muted-foreground">
                  {t("notifications.empty")}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 transition-colors cursor-pointer group flex items-start gap-3 relative ${ !notif.read
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
                        className={`text-xs font-semibold truncate ${ !notif.read ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {t(`notifications.seed.${notif.titleKey}` as TranslationKey)}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {notif.time}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {t(`notifications.seed.${notif.descKey}` as TranslationKey)}
                    </p>
                  </div>

                  {/* Single action dismiss button on hover */}
                  <button
                    type="button"
                    onClick={(e) => removeNotification(notif.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-danger rounded"
                    title={t("common.dismiss")}
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
                {t("notifications.footer")}
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] text-muted-foreground hover:text-danger transition-colors font-medium"
              >
                {t("notifications.clear_all")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
