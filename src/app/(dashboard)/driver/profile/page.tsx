import { UserProfile } from "@clerk/nextjs";

export default function DriverProfilePage() {
  return (
    <div className="p-4 md:p-6">
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
