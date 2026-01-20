import FlagsPage from "@/app/playground/flags/flags-page";
import { FlagsProvider } from "@/lib/flags";

export default function Page() {
  return (
    <FlagsProvider>
      <FlagsPage />
    </FlagsProvider>
  );
}
