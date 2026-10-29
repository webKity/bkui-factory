import { SIDEBAR_KEYBOARD_SHORTCUT } from './constants';

type Shortcuts = Map<HTMLElement, () => void>;
const documents = new WeakMap<Document, { shortcuts: Shortcuts; listener: (event: KeyboardEvent) => void }>();

/** 每个 Document 只监听一次，嵌套和并列的 Provider 不会重复处理同一次按键。 */
export function registerSidebarShortcut(element: HTMLElement, toggle: () => void) {
  const document = element.ownerDocument;
  let entry = documents.get(document);
  if (!entry) {
    const shortcuts: Shortcuts = new Map();
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey ||
          event.key.toLowerCase() !== SIDEBAR_KEYBOARD_SHORTCUT || !(event.metaKey || event.ctrlKey)) return;
      const focus = document.activeElement;
      let target: HTMLElement | undefined;
      for (const candidate of shortcuts.keys()) {
        if (focus && candidate.contains(focus) && (!target || target.contains(candidate))) target = candidate;
      }
      // 焦点在所有侧栏之外时，使用文档顺序中的第一个启用 Provider。
      if (!target) {
        for (const candidate of shortcuts.keys()) {
          if (!target || (candidate.compareDocumentPosition(target) & 4)) target = candidate;
        }
      }
      if (target) {
        event.preventDefault();
        shortcuts.get(target)?.();
      }
    };
    entry = { shortcuts, listener };
    documents.set(document, entry);
    document.defaultView?.addEventListener('keydown', listener);
  }
  entry.shortcuts.set(element, toggle);
  return () => {
    entry.shortcuts.delete(element);
    if (!entry.shortcuts.size) {
      document.defaultView?.removeEventListener('keydown', entry.listener);
      documents.delete(document);
    }
  };
}
