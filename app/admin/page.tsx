import { redirect } from "next/navigation";
import "@/app/admin/styles/admin.css";

export default function AdminPage() {
  // redirect user to default section, e.g. calendar
  redirect("/admin/kalender");
}
