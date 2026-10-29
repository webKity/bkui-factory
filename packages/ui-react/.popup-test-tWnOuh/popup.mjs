"use client";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

// packages/ui-react/src/components/popup/base.tsx
import { Dialog } from "@base-ui/react/dialog";
import { forwardRef as forwardRef2 } from "react";

// packages/ui-react/src/components/button/index.tsx
import { Button as BaseButton } from "@base-ui/react/button";
import { Children, forwardRef } from "react";

// packages/ui-react/src/components/utils/size.ts
var componentSizes = [
  "2xs",
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl"
];
var sizeBreakpointMinWidths = {
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
  "2xl": 96
};
var sizeBreakpoints = Object.keys(sizeBreakpointMinWidths);
function assertComponentSize(value, field = "size") {
  if (!componentSizes.includes(value)) {
    throw new Error(`${field}\uFF1A\u672A\u77E5\u5C3A\u5BF8 ${String(value)}`);
  }
}
function mapResponsiveSize(size, visit) {
  if (typeof size === "string") {
    assertComponentSize(size);
    visit("base", size);
    return;
  }
  if (!size || typeof size !== "object" || Array.isArray(size) || !Object.hasOwn(size, "base")) {
    throw new Error("size\uFF1A\u54CD\u5E94\u5F0F\u914D\u7F6E\u5FC5\u987B\u663E\u5F0F\u63D0\u4F9B base \u5C3A\u5BF8");
  }
  for (const [scope, value] of Object.entries(size)) {
    if (scope !== "base" && !sizeBreakpoints.includes(scope)) {
      throw new Error(`size\uFF1A\u672A\u77E5\u65AD\u70B9 ${scope}`);
    }
    assertComponentSize(value, `size.${scope}`);
  }
  visit("base", size.base);
  for (const breakpoint of sizeBreakpoints) {
    if (Object.hasOwn(size, breakpoint)) visit(breakpoint, size[breakpoint]);
  }
}
function getResponsiveSizeAttributes(size) {
  if (!size || typeof size !== "object") return {};
  return Object.fromEntries(
    sizeBreakpoints.filter((key) => Object.hasOwn(size, key)).map((key) => [`data-size-${key}`, true])
  );
}

// packages/ui-react/src/components/button/size.ts
var dimensions = [
  "height",
  "padding-x",
  "padding-y",
  "font-size",
  "line-height",
  "gap",
  "icon-size",
  "fixed-width"
];
function getButtonSizeStyle(size) {
  const style = {};
  const setSize = (scope, value) => {
    for (const dimension of dimensions) {
      style[`--button-${scope}-${dimension}`] = `var(--button-size-${value}-${dimension})`;
    }
  };
  mapResponsiveSize(size, setSize);
  return style;
}

// packages/ui-react/src/components/button/index.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function preventActivation(event) {
  event.preventDefault();
  event.stopPropagation();
}
var ButtonImpl = forwardRef(
  function Button(props, ref) {
    const {
      children,
      prefixIcon,
      suffixIcon,
      className: className2,
      intent = "normal",
      variant = "fill",
      shape = "rect",
      widthMode = "auto",
      size = "base",
      block = false,
      round = false,
      disabled = false,
      loading = false,
      link,
      type = "button",
      onClick,
      ...restProps
    } = props;
    const isDisabled = disabled || loading;
    const hasLabel = Children.toArray(children).length > 0;
    const hasLeading = loading || prefixIcon != null;
    const effectiveShape = block ? "rect" : shape;
    const effectiveWidthMode = block || effectiveShape !== "rect" ? "auto" : widthMode;
    if (process.env.NODE_ENV !== "production") {
      if (block && shape !== "rect") {
        console.warn(
          `[Button] shape="${shape}" \u4E0E block \u51B2\u7A81\uFF0Cblock \u573A\u666F\u4E0B shape \u4F1A\u88AB\u964D\u7EA7\u4E3A "rect"\u3002`
        );
      }
      if (block && widthMode === "fixed") {
        console.warn(
          `[Button] widthMode="fixed" \u4E0E block \u51B2\u7A81\uFF0Cblock \u573A\u666F\u4E0B widthMode \u4F1A\u88AB\u964D\u7EA7\u4E3A "auto"\u3002`
        );
      }
      if (shape !== "rect" && widthMode === "fixed" && !block) {
        console.warn(
          `[Button] widthMode="fixed" \u4E0E shape="${shape}" \u51B2\u7A81\uFF0Cshape \u4F18\u5148\uFF0CwidthMode \u4F1A\u88AB\u964D\u7EA7\u4E3A "auto"\u3002`
        );
      }
    }
    const commonProps = {
      className: ["bk-button", className2].filter(Boolean).join(" "),
      style: getButtonSizeStyle(size),
      ...getResponsiveSizeAttributes(size),
      "data-intent": intent,
      "data-variant": variant,
      "data-shape": effectiveShape !== "rect" ? effectiveShape : void 0,
      "data-width-mode": effectiveWidthMode !== "auto" ? effectiveWidthMode : void 0,
      "data-size": typeof size === "string" ? size : "responsive",
      "data-block": block || void 0,
      "data-round": round || void 0,
      // 视觉层：data-disabled 只由真正的 disabled 触发，loading 走独立的 data-loading 样式。
      "data-disabled": disabled || void 0,
      "data-loading": loading || void 0,
      "aria-busy": loading || void 0,
      // 阻止禁用、加载中的按钮触发父容器的点击行为。
      ...isDisabled ? { onClickCapture: preventActivation, onAuxClickCapture: preventActivation } : {}
    };
    const content = /* @__PURE__ */ jsxs("span", { className: "bk-button__content", children: [
      /* @__PURE__ */ jsx(
        "span",
        {
          className: "bk-button__leading",
          "aria-hidden": "true",
          "data-visible": hasLeading || void 0,
          "data-spacing": hasLabel || suffixIcon != null || void 0,
          children: /* @__PURE__ */ jsx("span", { className: "bk-button__leading-inner", children: loading ? /* @__PURE__ */ jsx("span", { className: "bk-button__spinner", "aria-hidden": "true" }) : prefixIcon != null && /* @__PURE__ */ jsx("span", { className: "bk-button__icon", "aria-hidden": "true", children: prefixIcon }) })
        }
      ),
      hasLabel && /* @__PURE__ */ jsx("span", { className: "bk-button__label", children }),
      suffixIcon != null && /* @__PURE__ */ jsx(
        "span",
        {
          className: "bk-button__icon bk-button__suffix",
          "data-spacing": hasLabel || void 0,
          "aria-hidden": "true",
          children: suffixIcon
        }
      )
    ] });
    if (props.link !== void 0) {
      return /* @__PURE__ */ jsx(
        "a",
        {
          ...restProps,
          ...commonProps,
          ref,
          href: isDisabled ? void 0 : props.link,
          role: props.role ?? (isDisabled ? "link" : void 0),
          tabIndex: disabled ? -1 : loading ? 0 : props.tabIndex,
          "aria-disabled": isDisabled || void 0,
          onClick: isDisabled ? preventActivation : props.onClick,
          onAuxClick: isDisabled ? preventActivation : props.onAuxClick,
          children: content
        }
      );
    }
    return /* @__PURE__ */ jsx(
      BaseButton,
      {
        ...restProps,
        ...commonProps,
        ref,
        type,
        disabled: isDisabled,
        focusableWhenDisabled: loading && !disabled,
        onClick: props.onClick,
        children: content
      }
    );
  }
);
ButtonImpl.displayName = "Button";
var Button2 = ButtonImpl;

// packages/ui-react/src/components/utils/styles.ts
import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
var twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["h1", "h2", "h3", "h4", "h5", "h6"]
    }
  }
});
var joinClassNames = (...inputs) => twMerge(clsx(inputs));
function withoutStyle(props) {
  const { style: _style, ...rest } = props;
  return rest;
}

// packages/ui-react/src/components/hooks/useIdleReady.ts
import { useEffect, useState } from "react";
var useIdleReady = (timeout = 500) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const win = window;
    if ("requestIdleCallback" in win) {
      const id = win.requestIdleCallback(() => setReady(true), { timeout });
      return () => win.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => setReady(true), timeout);
    return () => window.clearTimeout(timer);
  }, [timeout]);
  return ready;
};

// packages/ui-react/src/components/icon/registry.ts
var registry_exports = {};
__reExport(registry_exports, icons_star);
import * as icons_star from "@bkreact/assets/icons";

// packages/ui-react/src/components/icon/index.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var BKIcon = (props) => {
  const mounted = useIdleReady();
  const {
    name,
    variant,
    size = 16,
    className: className2,
    color,
    hoverColor,
    ariaLabel,
    renderInServer = false,
    onClick,
    "aria-label": nativeLabel,
    ...rest
  } = props;
  const icon = (0, registry_exports.getIconDefinition)(name, variant);
  if (!icon) return null;
  const ready = mounted || renderInServer;
  const label = ariaLabel ?? nativeLabel;
  const iconStyle = {
    "--bk-icon-color": color ?? "currentColor",
    "--bk-icon-hover-color": hoverColor ?? color ?? "currentColor",
    width: size,
    height: size,
    cursor: onClick ? "pointer" : void 0
  };
  return /* @__PURE__ */ jsx2(
    "span",
    {
      ...withoutStyle(rest),
      className: joinClassNames("bkreact-icon", className2),
      "data-placeholder": !ready ? "" : void 0,
      "data-hover-color": hoverColor ? "" : void 0,
      "aria-hidden": !ready ? true : rest["aria-hidden"],
      onClick,
      style: iconStyle,
      children: ready && /* @__PURE__ */ jsx2(
        "svg",
        {
          viewBox: icon.viewBox,
          width: size,
          height: size,
          fill: "none",
          role: label ? "img" : void 0,
          "aria-label": label,
          "aria-hidden": label ? void 0 : true,
          focusable: "false",
          children: icon.paths.map(({ fill, ...path }, index) => /* @__PURE__ */ jsx2(
            "path",
            {
              ...path,
              fill: fill && !["none", "currentColor"].includes(fill) ? color || hoverColor ? "currentColor" : fill : fill
            },
            index
          ))
        }
      )
    }
  );
};

// packages/ui-react/src/components/popup/base.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var Popup = Dialog.Root;
var PopupTriggerImpl = forwardRef2(function PopupTrigger(props, ref) {
  return /* @__PURE__ */ jsx3(Dialog.Trigger, { "data-slot": "popup-trigger", ...withoutStyle(props), ref });
});
PopupTriggerImpl.displayName = "PopupTrigger";
var PopupTrigger2 = PopupTriggerImpl;
var PopupClose = forwardRef2(function PopupClose2(props, ref) {
  return /* @__PURE__ */ jsx3(Dialog.Close, { "data-slot": "popup-close", ...withoutStyle(props), ref });
});
function className(base, custom) {
  return (state) => [base, typeof custom === "function" ? custom(state) : custom].filter(Boolean).join(" ");
}
var PopupContent = forwardRef2(function PopupContent2({
  side = "right",
  title,
  showCloseButton = true,
  closeLabel = "Close",
  portalContainer,
  className: custom,
  children,
  ...props
}, ref) {
  return /* @__PURE__ */ jsxs2(Dialog.Portal, { container: portalContainer, children: [
    /* @__PURE__ */ jsx3(Dialog.Backdrop, { "data-slot": "popup-overlay", className: "bkreact-popup bkreact-popup__overlay" }),
    /* @__PURE__ */ jsxs2(
      Dialog.Popup,
      {
        ...props,
        ref,
        "data-slot": "popup-content",
        "data-side": side,
        className: className("bkreact-popup bkreact-popup__content", custom),
        children: [
          title != null && /* @__PURE__ */ jsx3(PopupHeader, { children: /* @__PURE__ */ jsx3(PopupTitle, { children: title }) }),
          children,
          showCloseButton && /* @__PURE__ */ jsx3(PopupClose, { render: /* @__PURE__ */ jsx3(
            Button2,
            {
              className: "bkreact-popup__close",
              variant: "ghost",
              shape: "square",
              size: "xs",
              "aria-label": closeLabel,
              prefixIcon: /* @__PURE__ */ jsx3(BKIcon, { name: "close", renderInServer: true })
            }
          ) })
        ]
      }
    )
  ] });
});
var PopupHeader = forwardRef2(function PopupHeader2({ className: className2, ...props }, ref) {
  return /* @__PURE__ */ jsx3("div", { ...withoutStyle(props), ref, "data-slot": "popup-header", className: ["bkreact-popup__header", className2].filter(Boolean).join(" ") });
});
var PopupFooter = forwardRef2(function PopupFooter2({ className: className2, ...props }, ref) {
  return /* @__PURE__ */ jsx3("div", { ...withoutStyle(props), ref, "data-slot": "popup-footer", className: ["bkreact-popup__footer", className2].filter(Boolean).join(" ") });
});
var PopupTitle = forwardRef2(function PopupTitle2({ className: custom, ...props }, ref) {
  return /* @__PURE__ */ jsx3(Dialog.Title, { ...withoutStyle(props), ref, "data-slot": "popup-title", className: className("bkreact-popup__title", custom) });
});
var PopupDescription = forwardRef2(function PopupDescription2({ className: custom, ...props }, ref) {
  return /* @__PURE__ */ jsx3(Dialog.Description, { ...withoutStyle(props), ref, "data-slot": "popup-description", className: className("bkreact-popup__description", custom) });
});

// packages/ui-react/src/components/popup/imperative.tsx
import { Component, useCallback, useEffect as useEffect2, useRef, useState as useState2, useSyncExternalStore, forwardRef as forwardRef3, useImperativeHandle } from "react";
import { createRoot } from "react-dom/client";
import { jsx as jsx4 } from "react/jsx-runtime";
function createEntry(props, remove) {
  let open = true;
  let destroyed = false;
  const listeners = /* @__PURE__ */ new Set();
  const rootActionsRef = props.actionsRef ?? { current: null };
  const publish = (value) => {
    if (destroyed) return;
    open = value;
    listeners.forEach((listener) => listener());
  };
  const handle = {
    open: () => publish(true),
    close: () => {
      if (destroyed) return;
      if (!rootActionsRef.current) handle.destroy();
      else rootActionsRef.current.close();
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      remove();
    }
  };
  function Instance() {
    const visible = useSyncExternalStore(
      useCallback((listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }, []),
      () => open,
      () => false
    );
    const {
      onOpenChange,
      onOpenChangeComplete,
      modal,
      disablePointerDismissal,
      actionsRef: _actionsRef,
      handle: dialogHandle,
      triggerId,
      defaultTriggerId,
      ...contentProps
    } = props;
    return /* @__PURE__ */ jsx4(
      Popup,
      {
        open: visible,
        modal,
        disablePointerDismissal,
        handle: dialogHandle,
        triggerId,
        defaultTriggerId,
        actionsRef: rootActionsRef,
        onOpenChange: (next, details) => {
          onOpenChange?.(next, details);
          if (!details.isCanceled) publish(next);
        },
        onOpenChangeComplete: (next) => {
          try {
            onOpenChangeComplete?.(next);
          } finally {
            if (!next && !open) handle.destroy();
          }
        },
        children: /* @__PURE__ */ jsx4(PopupContent, { ...contentProps })
      }
    );
  }
  return { handle, element: /* @__PURE__ */ jsx4(Instance, {}) };
}
var Holder = forwardRef3(function Holder2(_, ref) {
  const [element, setElement] = useState2(null);
  useImperativeHandle(ref, () => ({ replace(next) {
    setElement(next);
    return () => setElement((current) => current === next ? null : current);
  } }), []);
  return element;
});
function usePopup() {
  const holder = useRef(null);
  const current = useRef(null);
  useEffect2(() => () => {
    current.current?.destroy();
    current.current = null;
  }, []);
  const create = useCallback((props) => {
    if (!holder.current) throw new Error("Render the usePopup holder before creating a popup");
    current.current?.destroy();
    let remove = () => {
    };
    const entry = createEntry(props, () => remove());
    remove = holder.current.replace(entry.element);
    current.current = entry.handle;
    return entry.handle;
  }, []);
  return [create, /* @__PURE__ */ jsx4(Holder, { ref: holder }, "popup-holder")];
}
var PopupErrorBoundary = class extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    this.props.onError();
    throw error;
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
};
function popup(props) {
  if (typeof document === "undefined") throw new Error("popup can only be used in the browser");
  const container = document.createElement("div");
  let root;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try {
      root?.unmount();
    } finally {
      container.remove();
    }
  };
  const entry = createEntry(props, () => {
    queueMicrotask(dispose);
  });
  document.body.append(container);
  try {
    root = createRoot(container);
    root.render(
      /* @__PURE__ */ jsx4(PopupErrorBoundary, { onError: entry.handle.destroy, children: entry.element })
    );
  } catch (error) {
    entry.handle.destroy();
    dispose();
    throw error;
  }
  return entry.handle;
}
export {
  Popup,
  PopupClose,
  PopupContent,
  PopupDescription,
  PopupFooter,
  PopupHeader,
  PopupTitle,
  PopupTrigger2 as PopupTrigger,
  popup,
  usePopup
};
