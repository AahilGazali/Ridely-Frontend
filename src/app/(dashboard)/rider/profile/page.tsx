import { UserProfile } from "@clerk/nextjs";

export default function RiderProfilePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold text-black">Profile</h1>
      <p className="mt-1 text-sm text-gray-600">Manage your account</p>
      <div className="mt-6">
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border rounded-xl",
            },
          }}
        />
      </div>
    </div>
  );
}
