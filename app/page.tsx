import Dashboard from "./dashboard";
import { requireChatGPTUser } from "./chatgpt-auth";
import { isUnlocked, lockConfigured } from "./app-lock";
import LockScreen from "./lock-screen";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requireChatGPTUser("/");
  if (!(await isUnlocked(user.userId))) return <LockScreen setup={!(await lockConfigured(user.userId))} />;
  const displayName = user.displayName;
  return <Dashboard displayName={displayName} email={user.email} />;
}
