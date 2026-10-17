/** In-app notifications (notification service). */

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  imageUrl?: string | null;
  params?: Record<string, string | number> | null;
  readAt: string | null;
  createdAt: string;
}
