import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl rounded-2xl",
          },
        }}
        signInUrl="/sign-in"
        afterSignUpUrl="/rider/dashboard"
        fallbackRedirectUrl="/rider/dashboard"
        forceRedirectUrl="/rider/dashboard"
      />
    </div>
  );
}
