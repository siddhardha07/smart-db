// Vitest setup file for frontend tests
import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch globally for all tests
global.fetch = vi.fn();

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Monaco Editor
vi.mock("monaco-editor", () => ({
  default: {},
  editor: {
    create: vi.fn(() => ({
      dispose: vi.fn(),
      getValue: vi.fn(() => ""),
      setValue: vi.fn(),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
    })),
    createModel: vi.fn(() => ({})),
    setTheme: vi.fn(),
    defineTheme: vi.fn(),
  },
  languages: {
    register: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
    setLanguageConfiguration: vi.fn(),
    registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
  },
  Range: class Range {},
  Selection: class Selection {},
  KeyCode: {},
  KeyMod: {},
}));

// Mock @monaco-editor/react
vi.mock("@monaco-editor/react", () => ({
  default: vi.fn(({ value, onChange, onMount, ...props }) => {
    React.useEffect(() => {
      if (onMount) {
        const mockEditor = {
          dispose: vi.fn(),
          getValue: vi.fn(() => value || ""),
          setValue: vi.fn(),
          onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
          addCommand: vi.fn(),
          onKeyDown: vi.fn(() => ({ dispose: vi.fn() })),
          focus: vi.fn(),
          getModel: vi.fn(() => ({ dispose: vi.fn() })),
        };
        onMount(mockEditor, {});
      }
    }, [onMount]);

    return React.createElement("textarea", {
      "data-testid": "monaco-editor",
      value: value || "",
      onChange: onChange
        ? (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value, { isFlush: false })
        : undefined,
      ...props,
    });
  }),
}));
