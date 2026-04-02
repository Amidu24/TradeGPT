import { cookies } from "next/headers";
import TradingApp from "@/components/TradingApp";
import LoginPage from "@/components/LoginPage";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("deriv_access_token")?.value;
  const accountId = cookieStore.get("deriv_account_id")?.value;
  const accountType = cookieStore.get("deriv_account_type")?.value ?? "demo";

  const { error } = await searchParams;

  if (!accessToken || !accountId) {
    return <LoginPage error={error} />;
  }

  return <TradingApp accountId={accountId} accountType={accountType} />;
}
