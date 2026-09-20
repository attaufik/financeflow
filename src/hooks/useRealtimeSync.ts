"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type SyncTable = "accounts" | "transactions" | "paylater_bills" | "categories";

interface UseRealtimeSyncOptions {
  tables?: SyncTable[];
  onSync: () => void;
  debounceMs?: number;
}

/**
 * Custom Hook untuk mendengarkan perubahan Postgres realtime di Supabase
 * Otomatis memperbarui data tanpa perlu refresh manual.
 */
export function useRealtimeSync({
  tables = ["accounts", "transactions", "paylater_bills"],
  onSync,
  debounceMs = 300,
}: UseRealtimeSyncOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleEvent = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onSync();
      }, debounceMs);
    };

    const channelName = `realtime-sync-${tables.join("-")}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    tables.forEach((tbl) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tbl,
        },
        () => {
          handleEvent();
        }
      );
    });

    channel.subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [tables.join(","), onSync, debounceMs]);
}
