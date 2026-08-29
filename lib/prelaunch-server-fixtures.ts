import { getRuntimeEnv } from "./runtime-env";

export function prelaunchServerFixturesEnabled() {
  try {
    const env = getRuntimeEnv();
    return env.PRELAUNCH_FIXTURES === "true"
      || env.NEXT_PUBLIC_PRELAUNCH_FIXTURES === "true";
  } catch {
    return process.env.PRELAUNCH_FIXTURES === "true"
      || process.env.NEXT_PUBLIC_PRELAUNCH_FIXTURES === "true";
  }
}
