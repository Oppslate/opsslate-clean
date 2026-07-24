import { SignIn } from "@clerk/nextjs";

import { HeliosAuthScreen } from "@/components/helios-auth-screen";
import { heliosClerkAppearance } from "@/lib/clerk-appearance";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <HeliosAuthScreen>
      <SignIn
        appearance={heliosClerkAppearance}
        fallbackRedirectUrl="/"
        signUpUrl="/sign-up"
      />
    </HeliosAuthScreen>
  );
}
