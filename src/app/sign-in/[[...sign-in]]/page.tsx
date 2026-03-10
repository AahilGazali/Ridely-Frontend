import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl rounded-2xl",
          },
        }}
        signUpUrl="/sign-up"
        afterSignInUrl="/rider/dashboard"
        fallbackRedirectUrl="/rider/dashboard"
        forceRedirectUrl="/rider/dashboard"
      />
    </div>
  );
}
