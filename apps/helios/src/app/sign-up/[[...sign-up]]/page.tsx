import { SignUp } from "@clerk/nextjs";

import { HeliosAuthScreen } from "@/components/helios-auth-screen";
import { heliosClerkAppearance } from "@/lib/clerk-appearance";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <HeliosAuthScreen>
      <SignUp
        appearance={heliosClerkAppearance}
        fallbackRedirectUrl="/"
        signInUrl="/sign-in"
      />
    </HeliosAuthScreen>
  );
}
