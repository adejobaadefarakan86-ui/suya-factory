"use client";
import { useSyncExternalStore } from "react";

// Some browsers rewrite phone numbers on the page (e.g. into links), which makes
// React warn that the page changed. Showing them only after the page loads avoids it.
const subscribe = () => () => {};

export function PhoneText({ value }: { value: string }) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false);
  return <>{inBrowser ? value : " "}</>;
}
