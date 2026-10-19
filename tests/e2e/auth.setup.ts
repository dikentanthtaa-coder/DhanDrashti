import { test as setup } from "@playwright/test";
import { e2eConfigured } from "./helpers";

setup("environment check", async () => {
  setup.skip(!e2eConfigured(), "E2E tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY");
});
