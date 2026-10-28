'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Notification } from './index';
import type { NotificationContextValue, NotificationInput, NotificationItem, NotificationPosition, NotificationProviderProps } from './type';

const NotificationContext = createContext<NotificationContextValue | null>(null);
const positions: NotificationPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const prefix = useId();
  const sequence = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const closeNotification = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems(current => current.map(item => item.id === id && !item.closing ? { ...item, closing: true } : item));
  }, []);
  const removeNotification = useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);
  const showNotification = useCallback((input: NotificationInput) => {
    const id = `${prefix}-notification-${++sequence.current}`;
    const { duration = 4500, ...item } = input;
    const timed = Number.isFinite(duration) && duration > 0;
    const expiresAt = timed ? Date.now() + duration : undefined;
    setItems(current => [...current, { ...item, id, duration, expiresAt, position: input.position ?? 'top-right', closing: false }]);
    if (timed) {
      timers.current.set(id, setTimeout(() => closeNotification(id), duration));
    }
    return id;
  }, [prefix, closeNotification]);

  useEffect(() => {
    setMounted(true);
    const pending = timers.current;
    return () => { pending.forEach(clearTimeout); pending.clear(); };
  }, []);
  const value = useMemo(() => ({ showNotification, closeNotification }), [showNotification, closeNotification]);

  return <NotificationContext.Provider value={value}>
    {children}
    {mounted && createPortal(positions.map(position => (
      <div key={position} className="bkreact-notification-viewport" data-position={position}>
        {items.filter(item => item.position === position).map(item => (
          <Notification key={item.id} item={item} onClose={item.closing ? removeNotification : closeNotification} />
        ))}
      </div>
    )), document.body)}
  </NotificationContext.Provider>;
}

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
}
