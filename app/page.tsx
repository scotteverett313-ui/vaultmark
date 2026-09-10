import type { Metadata } from "next";
import SessionSelect from "./SessionSelect";

export const metadata: Metadata = {
  title: "Session Select",
};

export default function SessionSelectPage() {
  return <SessionSelect />;
}
