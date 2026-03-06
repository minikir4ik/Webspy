"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Eye,
  Link as LinkIcon,
  Radar,
  Bell,
  TrendingDown,
  Package,
  BarChart3,
  Globe,
  Mail,
  Zap,
  ChevronDown,
  Star,
  Check,
  ArrowRight,
} from "lucide-react";

/* ─── Navbar ────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">WebSpy</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
          <a href="#faq" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            Start Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Reveal on scroll ──────────────────────────────────────── */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── FAQ Accordion ─────────────────────────────────────────── */
const faqItems = [
  { q: "What websites does WebSpy monitor?", a: "WebSpy works with any e-commerce website. We have specialized extractors for Shopify, Amazon, and Walmart, plus a generic extractor that works with any product page using JSON-LD, Open Graph tags, or meta tags." },
  { q: "How often are prices checked?", a: "Depends on your plan. Free plans get daily checks, Starter gets hourly, Pro gets every 15 minutes, and Business gets checks every 5 minutes." },
  { q: "Do I need a credit card to start?", a: "No. The free plan is completely free forever with no credit card required. You can track up to 10 products across 2 projects." },
  { q: "Can I cancel anytime?", a: "Yes. All paid plans are month-to-month with no contracts. Cancel anytime from your account settings and you'll keep access until the end of your billing period." },
  { q: "How do alerts work?", a: "You set custom rules for each product: price drops by X%, price goes below $Y, competitor undercuts your price, stock status changes, and more. When a rule triggers, you get an instant email notification." },
  { q: "Is my data secure?", a: "Absolutely. All data is encrypted in transit and at rest. We use Supabase with row-level security so you can only access your own data. SSL everywhere, 99.9% uptime." },
  { q: "What happens when I hit my product limit?", a: "You'll see a friendly notification suggesting an upgrade. Your existing tracking continues uninterrupted — you just can't add new products until you upgrade or remove some." },
  { q: "Can I track Amazon products?", a: "Yes! We support Amazon product pages. For best results, we recommend our Starter plan or higher which includes more frequent checks to keep up with Amazon's dynamic pricing." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-5 text-left">
        <span className="text-sm font-medium text-slate-900 pr-4">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-4" : "max-h-0"}`}>
        <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── Pricing ───────────────────────────────────────────────── */
function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const plans = [
    {
      name: "Free", price: 0, period: "/mo", features: ["10 products", "Daily checks", "7-day history", "5 email alerts/day", "2 projects"],
      cta: "Get Started Free", href: "/signup", style: "outline" as const,
    },
    {
      name: "Starter", price: annual ? 15 : 19, period: "/mo", features: ["100 products", "Hourly checks", "90-day history", "Unlimited email alerts", "10 projects"],
      cta: "Start Free Trial", href: "/signup?plan=starter", style: "solid" as const,
    },
    {
      name: "Pro", price: annual ? 39 : 49, period: "/mo", popular: true,
      features: ["500 products", "15-minute checks", "Unlimited history", "All channels + webhooks", "Unlimited projects", "API access"],
      cta: "Start Free Trial", href: "/signup?plan=pro", style: "gradient" as const,
    },
    {
      name: "Business", price: annual ? 119 : 149, period: "/mo",
      features: ["5,000 products", "5-minute checks", "Unlimited everything", "Priority support", "Custom extractors"],
      cta: "Contact Sales", href: "/signup?plan=business", style: "solid" as const,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-slate-600 mb-6">Start free. Upgrade when you need more.</p>
            <div className="inline-flex items-center gap-3 rounded-full bg-slate-100 p-1">
              <button onClick={() => setAnnual(false)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Monthly</button>
              <button onClick={() => setAnnual(true)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                Annual <span className="text-xs text-emerald-600 font-semibold ml-1">Save 20%</span>
              </button>
            </div>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 100}>
              <div className={`relative rounded-2xl bg-white p-6 shadow-sm border ${plan.popular ? "border-indigo-300 ring-2 ring-indigo-100 scale-[1.02]" : "border-slate-200"} flex flex-col h-full`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1 text-xs font-semibold text-white">Most Popular</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                <div className="mt-3 mb-6">
                  <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                  <span className="text-sm text-slate-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
                    plan.style === "gradient"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                      : plan.style === "solid"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 text-slate-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="text-center text-sm text-slate-500 mt-8">All plans include: SSL encryption · 99.9% uptime · Cancel anytime</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function LandingPage() {
  const features = [
    { icon: TrendingDown, title: "Real-Time Price Tracking", desc: "Track competitor prices across any e-commerce platform. Shopify, Amazon, Walmart, and more." },
    { icon: Package, title: "Stock Monitoring", desc: "Know instantly when competitors sell out or restock. Never miss a market opportunity." },
    { icon: Zap, title: "Smart Alerts", desc: "Custom rules: price drops, undercuts, stock changes, and more. Get notified instantly." },
    { icon: BarChart3, title: "Price History Charts", desc: "Visualize trends over time. Spot patterns, predict competitor moves before they happen." },
    { icon: Globe, title: "Multi-Platform Support", desc: "Shopify, Amazon, Walmart, and any website with product pages. One tool for everything." },
    { icon: Mail, title: "Daily Digests", desc: "Morning email summary of all competitor activity overnight. Start every day informed." },
  ];

  const testimonials = [
    { quote: "WebSpy saved us from missing a major competitor price drop. We adjusted in minutes and kept our Buy Box.", name: "Sarah K.", title: "Amazon FBA Seller" },
    { quote: "I used to check 20 competitor pages manually every morning. Now WebSpy does it automatically.", name: "Marcus T.", title: "Shopify Store Owner" },
    { quote: "The daily digest alone is worth the subscription. I start every morning knowing exactly what changed.", name: "Lisa R.", title: "Brand Manager" },
  ];

  const steps = [
    { num: "1", icon: LinkIcon, title: "Paste Competitor URLs", desc: "Add any product page. We detect Shopify, Amazon, Walmart automatically." },
    { num: "2", icon: Radar, title: "We Monitor 24/7", desc: "Automatic price and stock checks every 15 minutes. No manual work." },
    { num: "3", icon: Bell, title: "Get Instant Alerts", desc: "Email alerts when prices drop, stock changes, or competitors undercut you." },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-indigo-100/40 via-purple-100/30 to-transparent rounded-full blur-3xl -z-10" />
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <Reveal>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
              Stop Losing Sales to Competitors{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">You Aren&apos;t Watching</span>
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              WebSpy monitors competitor prices and stock in real-time. Get instant alerts when they change. React faster, sell smarter.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200/50 hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                Start Free — No Credit Card <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-slate-300 px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                See How It Works
              </a>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <p className="text-sm text-slate-500">
              <span className="text-emerald-600">✓</span> Free forever plan &nbsp;·&nbsp;
              <span className="text-emerald-600">✓</span> No credit card required &nbsp;·&nbsp;
              <span className="text-emerald-600">✓</span> Set up in 2 minutes
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-10 border-y border-slate-100 bg-slate-50/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-slate-500 mb-3">Trusted by 500+ online sellers</p>
          <p className="text-sm text-slate-400">Works with <span className="font-medium text-slate-600">Shopify</span> · <span className="font-medium text-slate-600">Amazon</span> · <span className="font-medium text-slate-600">Walmart</span> · <span className="font-medium text-slate-600">Any website</span></p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">How it works</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
            {steps.map((step, i) => (
              <Reveal key={step.num} delay={i * 150}>
                <div className="text-center relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-lg font-bold mb-4 shadow-lg shadow-indigo-200/40">
                    {step.num}
                  </div>
                  <div className="flex items-center justify-center mb-3">
                    <step.icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything you need to outsmart your competitors</h2>
              <p className="text-slate-600">Powerful tools, simple interface. No technical skills required.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 mb-4">
                    <f.icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection />

      {/* ── Testimonials ── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">What sellers are saying</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.title}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 bg-slate-50/50">
        <div className="max-w-2xl mx-auto px-6">
          <Reveal>
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Frequently asked questions</h2>
          </Reveal>
          <Reveal delay={100}>
            <div>
              {faqItems.map((item) => (
                <FaqItem key={item.q} {...item} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to stop guessing and start knowing?
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-lg text-slate-400 mb-8">
              Join 500+ sellers who monitor their competitors with WebSpy.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
            >
              Start Free — No Credit Card <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Eye className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900">WebSpy</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
              <Link href="/login" className="hover:text-slate-900 transition-colors">Login</Link>
              <Link href="/signup" className="hover:text-slate-900 transition-colors">Sign Up</Link>
            </div>
            <p className="text-xs text-slate-400">© 2026 WebSpy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
