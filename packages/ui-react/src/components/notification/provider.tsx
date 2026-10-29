'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Notification } from './Notification';
import { DEFAULT_NOTIFICATION_DURATION } from './constants';
import type {
  NotificationContextValue,
  NotificationInput,
  NotificationItem,
  NotificationPosition,
  NotificationProviderProps,
} from './type';

const NotificationContext = createContext<NotificationContextValue | null>(null);
const positions: NotificationPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export function NotificationProvider({ children, className }: NotificationProviderProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const prefix = useId();
  const sequence = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const closeNotification = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems(current =>
      current.map(item => (item.id === id && !item.closing ? { ...item, closing: true } : item)),
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  const showNotification = useCallback(
    (input: NotificationInput) => {
      const id = `${prefix}-notification-${++sequence.current}`;
      const { duration = DEFAULT_NOTIFICATION_DURATION, ...item } = input;
      const timed = Number.isFinite(duration) && duration > 0;
      const expiresAt = timed ? Date.now() + duration : undefined;
      setItems(current => [
        ...current,
        {
          ...item,
          id,
          duration,
          expiresAt,
          position: input.position ?? 'top-right',
          closing: false,
        },
      ]);

      if (timed) {
        timers.current.set(
          id,
          setTimeout(() => closeNotification(id), duration),
        );
      }

      return id;
    },
    [prefix, closeNotification],
  );

  useEffect(() => {
    setMounted(true);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ showNotification, closeNotification }),
    [showNotification, closeNotification],
  );

  const grouped = useMemo(() => {
    const groups: Record<NotificationPosition, NotificationItem[]> = {
      'top-left': [],
      'top-right': [],
      'bottom-left': [],
      'bottom-right': [],
    };

    for (const item of items) groups[item.position ?? 'top-right'].push(item);

    return groups;
  }, [items]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          positions.map(position => (
            <div
              key={position}
              className={['bkreact-notification-viewport', className].filter(Boolean).join(' ')}
              data-position={position}
            >
              {/* 顶部新通知在最上方，底部新通知在最下方，始终靠近指定角落。 */}
              {(position.startsWith('top')
                ? [...grouped[position]].reverse()
                : grouped[position]
              ).map(item => (
                <Notification
                  key={item.id}
                  item={item}
                  onClose={closeNotification}
                  onRemoved={removeNotification}
                />
              ))}
            </div>
          )),
          document.body,
        )}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) throw new Error('useNotification must be used within a NotificationProvider');

  return context;
}
