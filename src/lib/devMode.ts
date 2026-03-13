const DEV_HOSTS = ["localhost", "127.0.0.1"];

export function isDevMode(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return DEV_HOSTS.includes(host) || host.includes("lovable.app");
}
