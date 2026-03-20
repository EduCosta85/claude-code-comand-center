import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { RegistryAll } from "../lib/types";

const EMPTY: RegistryAll = { agents: [], skills: [], hooks: [], plugins: [] };

export function useRegistry() {
  const [data, setData] = useState<RegistryAll>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.registry()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { ...data, loading };
}
