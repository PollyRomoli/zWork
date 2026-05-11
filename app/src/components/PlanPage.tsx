import { useState } from "react";
import { type CloudUser, createBillingCheckoutSession, createBillingPortalSession, redeemAccessCode } from "../lib/cloud";

export function PlanPage({
  cloudUser,
}: {
  cloudUser: CloudUser;
}) {
  const isPro = cloudUser.tier === "pro";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  const handleRedeem = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponBusy(true);
    setError("");
    try {
      await redeemAccessCode(code);
      setCouponCode("");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setCouponBusy(false);
    }
  };

  const handleUpgrade = async () => {
    setBusy(true);
    setError("");
    try {
      const session = await createBillingCheckoutSession(false);
      window.open(session.url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setBusy(false);
    }
  };

  const handleManage = async () => {
    setBusy(true);
    setError("");
    try {
      const session = await createBillingPortalSession();
      window.open(session.url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-y-auto bg-paper">
      <div className="mx-auto w-full max-w-[600px] px-6 py-8">

        {/* Header */}
        <header className="mb-8 border-b border-line/50 pb-6">
          <h1 className="text-[36px] font-light tracking-tight text-ink">
            Plan
          </h1>
          <p className="mt-2 text-[14px] text-ink-muted">
            Manage your subscription
          </p>
        </header>

        {/* Current Plan Card */}
        <section className="rounded-2xl border border-line bg-paper p-6">
          <div className="mb-6">
            <p className="text-[13px] uppercase tracking-wide text-ink-faint">Current plan</p>
          </div>

          <div className="mb-6">
            <h2 className="text-[32px] font-light tracking-tight text-ink">
              zWork {isPro ? "Pro" : "Free"}
            </h2>
          </div>

          {/* Features list */}
          <div className="space-y-3">
            {isPro ? (
              <>
                <div className="flex items-center gap-3 text-[14px] text-ink">
                  <div className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                  <span>Priority processing</span>
                </div>
                <div className="flex items-center gap-3 text-[14px] text-ink">
                  <div className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                  <span>Hosted AI gateway access</span>
                </div>
                <div className="flex items-center gap-3 text-[14px] text-ink">
                  <div className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                  <span>Advanced analytics</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-[14px] text-ink">
                  <div className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                  <span>20 root requests per 5 hours</span>
                </div>
                <div className="flex items-center gap-3 text-[14px] text-ink">
                  <div className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                  <span>100 requests per week</span>
                </div>
                <div className="flex items-center gap-3 text-[14px] text-ink">
                  <div className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                  <span>Standard processing</span>
                </div>
              </>
            )}
          </div>

          {!isPro && (
            <div className="mt-6 rounded-xl border border-line bg-paper-raised p-4">
              <p className="text-[13px] font-medium text-ink">Redeem access code</p>
              <p className="mt-0.5 text-[12px] text-ink-muted">Enter a code to upgrade your plan.</p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter code…"
                  disabled={couponBusy}
                  className="block flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none disabled:opacity-40"
                  onKeyDown={(e) => { if (e.key === "Enter") handleRedeem(); }}
                />
                <button
                  type="button"
                  disabled={couponBusy || !couponCode.trim()}
                  onClick={handleRedeem}
                  className="press ring-focus rounded-lg bg-ink px-4 py-2 text-[12.5px] font-medium text-paper hover:bg-ink-soft disabled:opacity-40"
                >
                  {couponBusy ? "Redeeming…" : "Redeem"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700">{error}</p>
          )}

          {/* Action button */}
          <div className="mt-8">
            {isPro ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleManage}
                className="press ring-focus w-full rounded-xl border border-line/60 bg-paper-raised px-4 py-3 text-[14px] font-medium text-ink hover:bg-paper-sunken transition-colors disabled:opacity-40"
              >
                {busy ? "Loading…" : "Manage subscription"}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={handleUpgrade}
                className="press ring-focus w-full rounded-xl bg-ink px-4 py-3 text-[14px] font-medium text-paper hover:bg-ink/90 transition-colors disabled:opacity-40"
              >
                {busy ? "Loading…" : "Upgrade to Pro"}
              </button>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
