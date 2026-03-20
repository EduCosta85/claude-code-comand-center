import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { RegistryAll } from "../lib/types";

const EMPTY: RegistryAll = { agents: [], skills: [], hooks: [], plugins: [] };

export function useRegistry(projectDir?: string) {
  const [data, setData] = useState<RegistryAll>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.registry(projectDir)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectDir]);

  return { ...data, loading };
}

export function useProjectDirs() {
  const [dirs, setDirs] = useState<string[]>([]);

  useEffect(() => {
    api.projectDirs().then(setDirs).catch(() => {});
  }, []);

  return dirs;
}
