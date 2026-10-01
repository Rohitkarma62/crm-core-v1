import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vishwakarma.crm",
  appName: "Vishwakarma CRM",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;
