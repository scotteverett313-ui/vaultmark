import type { Metadata } from "next";
import Library from "./Library";

export const metadata: Metadata = {
  title: "Library",
};

export default function LibraryPage() {
  return <Library />;
}
