declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

export function initOneSignal() {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.init({
      appId: "e5e608d0-1fad-4e9a-84ca-9812ac96a3a1",
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: "push",
              autoPrompt: false,
              text: {
                actionMessage: "Blijf op de hoogte van events bij Eagle Amsterdam!",
                acceptButton: "Toestaan",
                cancelButton: "Nee bedankt",
              },
            },
          ],
        },
      },
    });

    // Show slide prompt automatically after init (only if not already subscribed)
    const permission = await OneSignal.Notifications.permission;
    if (!permission) {
      OneSignal.Slidedown.promptPush();
    }
  });
}
