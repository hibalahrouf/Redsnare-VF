/**
 * Centralized Notification Service for RedSnare
 * Handles persistent storage and real-time alerts
 */

export interface RSNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  txHash?: string;
  eventName?: string;
  details?: any;
  isNew: boolean;
}

const STORAGE_KEY = 'rs-notifications-v2';

export const NotificationService = {
  getNotifications(): RSNotification[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  },

  addNotification(notif: Omit<RSNotification, 'id' | 'timestamp' | 'isNew'>) {
    if (typeof window === 'undefined') return;
    
    const newNotif: RSNotification = {
      ...notif,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      isNew: true
    };

    const existing = this.getNotifications();
    const updated = [newNotif, ...existing].slice(0, 50);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // Trigger a custom event for real-time UI updates
    window.dispatchEvent(new CustomEvent('rs-notif-update'));
    return newNotif;
  },

  clearAll() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('rs-notif-update'));
  }
};
