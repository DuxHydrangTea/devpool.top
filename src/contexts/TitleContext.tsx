import { createContext, useContext } from "solid-js";

export const TitleContext = createContext<[() => string, (t: string) => void]>();

export function usePageTitle() {
  const ctx = useContext(TitleContext);
  if (!ctx) throw new Error("usePageTitle must be used within TitleContext");
  return ctx;
}
