interface JsonViewerProps {
  data: unknown;
}

export function JsonViewer({ data }: JsonViewerProps) {
  const formatted = JSON.stringify(data, null, 2);
  return (
    <pre className="text-xs font-mono text-slate-300 bg-black/40 rounded-lg p-4 overflow-auto max-h-80 whitespace-pre-wrap break-all">
      {formatted}
    </pre>
  );
}
