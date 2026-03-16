const DEV_HOSTS = ["localhost", "127.0.0.1"];

export function isDevMode(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  // Only localhost/127.0.0.1 are dev — preview and published URLs get full caching
  return DEV_HOSTS.includes(host);
}
