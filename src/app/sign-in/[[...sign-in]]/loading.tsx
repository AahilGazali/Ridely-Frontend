export default function SignInLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#00d68f] border-t-transparent" />
        <p className="text-sm text-gray-500">Loading sign in...</p>
      </div>
    </div>
  );
}
