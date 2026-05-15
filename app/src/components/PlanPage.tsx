import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { type CloudUser, createBillingCheckoutSession, createBillingPortalSession, redeemAccessCode } from "../lib/cloud";
import { cn } from "../lib/cn";

interface PricingTier {
  id: "free" | "pro" | "max";
  name: string;
  price: number;
  priceDisplay: string;
  description: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "zWork Free",
    price: 0,
    priceDisplay: "$0/mo",
    description: "For getting started",
    features: [
      "20 root requests per 5 hours",
      "100 requests per week",
      "Standard processing",
    ],
  },
  {
    id: "pro",
    name: "zWork Pro",
    price: 12,
    priceDisplay: "$12/mo",
    description: "For serious work",
    features: [
      "200 root requests per 5 hours",
      "2,000 requests per week",
      "Hosted AI gateway access",
      "Advanced analytics",
      "Priority support",
    ],
    highlight: true,
    badge: "Recommended",
  },
  {
    id: "max",
    name: "zWork Max",
    price: 50,
    priceDisplay: "$50/mo",
    description: "For power users",
    features: [
      "1,000 root requests per 5 hours",
      "10,000 requests per week",
      "Everything in Pro",
      "Priority processing",
      "Dedicated support",
    ],
  },
];

export function PlanPage({
  cloudUser,
}: {
  cloudUser: CloudUser;
}) {
  const isPro = cloudUser.tier === "pro";
  const isMax = cloudUser.tier === "max";
  const currentTier = isMax ? "max" : isPro ? "pro" : "free";

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

  const handleUpgrade = async (tier: "pro" | "max") => {
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
      <div className="mx-auto w-full max-w-[1000px] px-6 py-8">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-[36px] font-light tracking-tight text-ink">Plan</h1>
          <p className="mt-2 text-[14px] text-ink-muted">
            Choose the right plan for your work
          </p>
        </header>

        {/* Pricing Cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {PRICING_TIERS.map((tier) => {
            const isCurrent = tier.id === currentTier;
            const canUpgrade = tier.id !== "free" && !isCurrent;

            return (
              <div
                key={tier.id}
                className={cn(
                  "relative rounded-2xl border bg-paper p-6 transition-all",
                  isCurrent
                    ? "border-line-strong ring-2 ring-ring"
                    : tier.highlight
                      ? "border-line bg-paper-raised"
                      : "border-line bg-paper",
                )}
              >
                {tier.badge && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full border border-line bg-paper-raised px-2.5 py-0.5 text-[11px] font-medium text-ink shadow-sm">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className={cn(
                    "text-[17px] font-semibold tracking-tight text-ink",
                    tier.highlight && "text-[18px]"
                  )}>
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-[13px] text-ink-muted">{tier.description}</p>
                </div>

                <div className="mb-6">
                  <div className="text-[32px] font-light tracking-tight text-ink">
                    {tier.priceDisplay}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[14px] text-ink">
                      <Check className={cn(
                        "h-4 w-4 shrink-0 mt-0.5",
                        isCurrent ? "text-ink" : "text-ink-muted"
                      )} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    type="button"
                    onClick={handleManage}
                    disabled={busy}
                    className="press ring-focus w-full rounded-xl border border-line/60 bg-paper-raised px-4 py-3 text-[14px] font-medium text-ink hover:bg-paper-sunken transition-colors disabled:opacity-40"
                  >
                    Current plan
                  </button>
                ) : canUpgrade ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleUpgrade(tier.id)}
                    className={cn(
                      "press ring-focus w-full rounded-xl px-4 py-3 text-[14px] font-medium transition-colors disabled:opacity-40",
                      tier.highlight
                        ? "bg-ink text-paper hover:bg-ink/90"
                        : "border border-line bg-paper text-ink hover:bg-paper-sunken"
                    )}
                  >
                    Upgrade to {tier.name}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl border border-line/40 bg-paper px-4 py-3 text-[14px] font-medium text-ink-muted opacity-60 cursor-not-allowed"
                  >
                    Downgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Coupon Redemption */}
        {currentTier === "free" && (
          <section className="rounded-2xl border border-line bg-paper-raised p-5">
            <div className="mb-3">
              <h3 className="text-[16px] font-semibold text-ink">Redeem access code</h3>
              <p className="mt-1 text-[13px] text-ink-muted">
                Have a code? Enter it below to upgrade your plan.
              </p>
            </div>
            <div className="flex gap-2">
              <label htmlFor="coupon-code-input" className="sr-only">Access code</label>
              <input
                id="coupon-code-input"
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter code…"
                disabled={couponBusy}
                className="block flex-1 rounded-lg border border-line bg-paper px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none disabled:opacity-40"
                onKeyDown={(e) => { if (e.key === "Enter") handleRedeem(); }}
              />
              <button
                type="button"
                disabled={couponBusy || !couponCode.trim()}
                onClick={handleRedeem}
                className="press ring-focus rounded-xl bg-ink px-5 py-2.5 text-[13px] font-medium text-paper hover:bg-ink-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {couponBusy ? "Redeeming…" : "Redeem"}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-[13px] text-red-600">{error}</p>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
