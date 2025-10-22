// Mock Monaco Editor for tests
export default {};
export const editor = {
  create: () => ({
    dispose: () => {},
    getValue: () => "",
    setValue: () => {},
    onDidChangeModelContent: () => ({ dispose: () => {} }),
  }),
  createModel: () => ({}),
  setTheme: () => {},
};
export const languages = {
  register: () => {},
  setMonarchTokensProvider: () => {},
  setLanguageConfiguration: () => {},
  registerCompletionItemProvider: () => ({ dispose: () => {} }),
};
export const Range = class Range {};
export const Selection = class Selection {};
export const KeyCode = {};
export const KeyMod = {};
