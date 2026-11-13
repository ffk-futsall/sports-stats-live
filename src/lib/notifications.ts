// Notification permissions management

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ============ REAL PUSH (Service Worker + VAPID) ============
export const pushNotifications = {
  isSupported: (): boolean =>
    'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY,

  registerServiceWorker: async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      return await navigator.serviceWorker.register('/sw.js');
    } catch (err) {
      console.error('Regjistrimi i Service Worker dështoi:', err);
      return null;
    }
  },

  subscribe: async (): Promise<boolean> => {
    if (!pushNotifications.isSupported()) return false;
    try {
      const registration = await pushNotifications.registerServiceWorker();
      if (!registration) return false;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = subscription.toJSON();
      const apiBase = '/api/push-subscribe';

      await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent.substring(0, 200),
        }),
      });

      return true;
    } catch (err) {
      console.error('Push subscription dështoi:', err);
      return false;
    }
  },

  unsubscribe: async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        const apiBase = '/api/push-subscribe';
        await fetch(apiBase, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
    } catch (err) {
      console.error('Push unsubscribe dështoi:', err);
    }
  },
};

export const notificationPermissions = {
  // Check if browser supports notifications
  isSupported: (): boolean => {
    return 'Notification' in window;
  },

  // Get current permission status
  getPermission: (): NotificationPermission => {
    if (!notificationPermissions.isSupported()) return 'denied';
    return Notification.permission;
  },

  // Request notification permission
  requestPermission: async (): Promise<NotificationPermission> => {
    if (!notificationPermissions.isSupported()) return 'denied';
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('notifications_enabled', 'true');
    }
    return permission;
  },

  // Check if notifications are enabled in app
  isEnabled: (): boolean => {
    return localStorage.getItem('notifications_enabled') === 'true' && 
           notificationPermissions.getPermission() === 'granted';
  },

  // Enable notifications in app
  enable: async (): Promise<boolean> => {
    const permission = await notificationPermissions.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('notifications_enabled', 'true');
      return true;
    }
    return false;
  },

  // Disable notifications in app
  disable: (): void => {
    localStorage.setItem('notifications_enabled', 'false');
  },

  // Send a notification
  send: (title: string, options?: NotificationOptions): void => {
    if (notificationPermissions.isEnabled()) {
      try {
        new Notification(title, {
          icon: 'https://d64gsuwffb70l.cloudfront.net/69b1c5d3aa33715dda5ad3a9_1773258315744_b173e8af.png',
          badge: 'https://d64gsuwffb70l.cloudfront.net/69b1c5d3aa33715dda5ad3a9_1773258315744_b173e8af.png',
          ...options,
        });
      } catch (err) {
        console.error('Failed to send notification:', err);
      }
    }
  },
};

// Notification service for app events
export const notificationService = {
  notifyMatchFinished: (homeTeam: string, awayTeam: string, homeScore: number, awayScore: number): void => {
    notificationService.send(
      `Ndeshja përfundoi: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`,
      {
        body: `Rezultati final: ${homeTeam} vs ${awayTeam}`,
        tag: 'match-finished',
        requireInteraction: false,
      }
    );
  },

  notifyNewNews: (title: string, description?: string): void => {
    notificationService.send(
      `📰 Lajm i ri: ${title}`,
      {
        body: description || 'Lexo lajmin e ri në aplikacion',
        tag: 'news-posted',
        requireInteraction: false,
      }
    );
  },

  notifyNewVideo: (title: string): void => {
    notificationService.send(
      `🎥 Video e re: ${title}`,
      {
        body: 'Shiko videon e re në aplikacion',
        tag: 'video-posted',
        requireInteraction: false,
      }
    );
  },

  notifyNewTeam: (teamName: string): void => {
    notificationService.send(
      `⚽ Skuadra e re: ${teamName}`,
      {
        body: 'Skuadra e re u shtua në aplikacion',
        tag: 'team-added',
        requireInteraction: false,
      }
    );
  },

  notifyNewMatch: (homeTeam: string, awayTeam: string, time: string): void => {
    notificationService.send(
      `⏰ Ndeshje e re: ${homeTeam} vs ${awayTeam}`,
      {
        body: `Ora: ${time}`,
        tag: 'match-added',
        requireInteraction: false,
      }
    );
  },

  send: (title: string, options?: NotificationOptions): void => {
    notificationPermissions.send(title, options);
  },
};
