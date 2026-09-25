import type { Locale } from "@/i18n/routing";
import type messages from "../messages/en.json";

// Strongly types next-intl: message keys are checked against en.json.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
