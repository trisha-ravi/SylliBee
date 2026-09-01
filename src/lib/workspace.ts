const WORKSPACE_KEY = 'syllibee-workspace-id';

export function getWorkspaceId(): string {
  try {
    const existing = localStorage.getItem(WORKSPACE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(WORKSPACE_KEY, id);
    return id;
  } catch {
    return 'local-fallback-workspace';
  }
}
