import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="secondary">
        Se déconnecter
      </Button>
    </form>
  );
}
