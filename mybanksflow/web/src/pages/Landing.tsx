import { Link } from "react-router-dom";
import {
  PiggyBank,
  BarChart3,
  ArrowLeftRight,
  Upload,
  CalendarClock,
  Shield,
  Users,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: ArrowLeftRight,
    title: "Transacties",
    desc: "Alle transacties overzichtelijk op één plek, automatisch gecategoriseerd.",
  },
  {
    icon: BarChart3,
    title: "Rapporten",
    desc: "Inzicht in je cashflow, uitgaven per categorie en trends over tijd.",
  },
  {
    icon: PiggyBank,
    title: "Budgetten",
    desc: "Stel budgetten in per categorie of contact en volg je voortgang.",
  },
  {
    icon: CalendarClock,
    title: "Geplande uitgaven",
    desc: "Plan terugkerende betalingen en houd overzicht op wat nog komt.",
  },
  {
    icon: Upload,
    title: "Bank import",
    desc: "Importeer CSV-bestanden van alle grote Nederlandse banken.",
  },
  {
    icon: Users,
    title: "Contacten",
    desc: "Beheer je contacten en bekijk per contact hoeveel je uitgeeft.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <PiggyBank className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">MyBanksFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/demo">Demo bekijken</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Inloggen</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Beheer je financiën
            <span className="block text-primary"> slim en overzichtelijk</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Importeer je banktransacties, categoriseer automatisch, stel budgetten in en krijg helder inzicht in je geldstromen — alles op één plek.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button size="lg" asChild>
              <Link to="/auth">
                Gratis starten
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/demo">Demo bekijken</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-12 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Alles wat je nodig hebt
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border/50 bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/30 bg-card/50">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold mb-3">Klaar om te beginnen?</h2>
          <p className="text-muted-foreground mb-6">
            Start gratis en krijg direct inzicht in je financiën.
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">
              Gratis account aanmaken
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MyBanksFlow — Jouw financiën, jouw overzicht.
        </p>
      </footer>
    </div>
  );
}
