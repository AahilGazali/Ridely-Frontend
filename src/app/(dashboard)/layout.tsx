import { Navbar } from "@/components/Navbar";
import { LocationPrompt } from "@/components/LocationPrompt";

/**
 * Shared layout for rider and driver dashboards - adds Navbar and location prompt.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <LocationPrompt />
      <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
    </div>
  );
}
