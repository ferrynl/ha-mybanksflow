import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Release {
  version: string;
  date: string;
  title: string;
  changes: { type: "feature" | "fix" | "improvement"; text: string }[];
}

const RELEASES: Release[] = [
  {
    version: "1.16",
    date: "28 maart 2026",
    title: "Contractdetails, Auto-koppeling & Bestanduploads",
    changes: [
      { type: "feature", text: "Contractdetailpagina: bekijk alle gekoppelde transacties per contract" },
      { type: "feature", text: "Documenten uploaden bij contracten (afbeeldingen en PDF's)" },
      { type: "feature", text: "Geplande transacties worden automatisch gekoppeld aan geïmporteerde banktransacties op basis van rekening, dag en bedrag" },
      { type: "feature", text: "Geplande transacties zijn nu altijd bewerkbaar, ongeacht gekoppelde betalingen" },
      { type: "improvement", text: "Contracten tonen nu een 'Bekijken' knop voor de detailpagina" },
      { type: "improvement", text: "Import herkent automatisch geplande transacties en koppelt ze" },
    ],
  },
  {
    version: "1.15",
    date: "27 maart 2026",
    title: "Contractenmodule & Self-hosting",
    changes: [
      { type: "feature", text: "Nieuwe module: Contracten — beheer al je lopende contracten en abonnementen" },
      { type: "feature", text: "Koppel contracten aan contacten, categorieën en geplande transacties" },
      { type: "feature", text: "Contractrapport met overzicht van maandelijkse en jaarlijkse kosten" },
      { type: "feature", text: "Dashboard-melding wanneer contracten binnen 2 maanden verlopen" },
      { type: "feature", text: "Self-hosting setup met Docker Compose voor eigen VPS" },
      { type: "improvement", text: "Zoekfunctie op contractnaam, klantnummer en polisnummer" },
    ],
  },
  {
    version: "1.14",
    date: "15 maart 2026",
    title: "Slimme voorspelling, Logo-beheer & Geplande fix",
    changes: [
      { type: "feature", text: "Saldovoorspelling gebruikt nu geplande transacties op hun specifieke datum — groene stippen in de grafiek" },
      { type: "feature", text: "Banklogo's beheren via Admin-paneel: upload nieuwe logo's per bank (PNG/JPG/WebP)" },
      { type: "feature", text: "Geüploade banklogo's worden automatisch overal in de app gebruikt met fallback naar standaardlogo's" },
      { type: "fix", text: "Geplande transacties blijven nu zichtbaar op de Gepland-pagina, ook na betaling — met 'Betaald' label" },
      { type: "fix", text: "Betaalde geplande transacties worden niet meer meegeteld in de cashflow-totalen" },
      { type: "improvement", text: "Alle wensen en bugs afgehandeld en gemarkeerd als afgerond in de Wensen & Bugs module" },
    ],
  },
  {
    version: "1.13",
    date: "13 maart 2026",
    title: "Categorie-regels, Import logging & Grafiekfix",
    changes: [
      { type: "fix", text: "Uitgaven per categorie op dashboard: subcategorieën worden nu correct opgeteld bij de hoofdcategorie" },
      { type: "feature", text: "Categorie toepassen op alle vergelijkbare transacties bij het bewerken — wordt ook opgeslagen als automatische regel" },
      { type: "feature", text: "Automatische categorisatieregels inzien, bewerken en verwijderen via Instellingen" },
      { type: "feature", text: "Mislukte imports worden gelogd met foutmelding en bestandspreview, zichtbaar in Admin-paneel" },
      { type: "improvement", text: "Alle items opgelost via de Wensen & Bugs module" },
    ],
  },
  {
    version: "1.12",
    date: "13 maart 2026",
    title: "Grote bugfix & feature release",
    changes: [
      { type: "fix", text: "Transactieteller klopt nu — limiet van 1000 verwijderd (tot 50.000 transacties)" },
      { type: "fix", text: "Transactie bewerken toont nu het volledige bedrag (€4,00 i.p.v. €4)" },
      { type: "fix", text: "Admin > Gebruikers foutmelding opgelost met betere sessievalidatie" },
      { type: "fix", text: "Backup herstellen werkt nu correct met juiste volgorde voor versleutelde velden" },
      { type: "fix", text: "Import snelheid verbeterd door batch-verwerking (tot 5x sneller)" },
      { type: "feature", text: "Voortgangsbalk bij importeren met real-time status per stap" },
      { type: "feature", text: "Banklogo's op het dashboard bij rekeningoverzicht" },
      { type: "feature", text: "Klik op een rekening op het dashboard om direct naar Rapporten te gaan" },
      { type: "feature", text: "Contact detailpagina: klik op een contact voor alle transactie-info" },
      { type: "feature", text: "Wensen & Bugs: oplopende nummering per item" },
      { type: "feature", text: "Wensen & Bugs: apart filter voor afgeronde items" },
      { type: "improvement", text: "Alle fixes en wensen in deze release zijn gemeld via de Wensen & Bugs module" },
    ],
  },
  {
    version: "1.11",
    date: "13 maart 2026",
    title: "Community fixes, Admin beheer & Help",
    changes: [
      { type: "fix", text: "Budget op hoofdcategorie telt nu ook uitgaven van subcategorieën mee" },
      { type: "fix", text: "Revolut CSV import werkt nu correct met komma-bedragen" },
      { type: "fix", text: "ING import: verbeterde duplicaatdetectie op basis van mededelingen" },
      { type: "fix", text: "Homepage: subcategorieën staan nu correct onder hun hoofdcategorie" },
      { type: "feature", text: "Admin beheer in Wensen & Bugs: status wijzigen, reageren en verwijderen" },
      { type: "feature", text: "Statuslabels bij wensen en bugs: Open, In behandeling, Gepland, Afgerond, Afgewezen" },
      { type: "feature", text: "Beheerder kan een reactie plaatsen bij elke wens of bug" },
      { type: "feature", text: "Transactiefilter 'Onverwerkt' toont transacties zonder categorie" },
      { type: "feature", text: "Help-tooltips bij Dashboard, Transacties, Budget, Import en Wensen & Bugs" },
      { type: "improvement", text: "Alle fixes en wensen in deze release zijn gemeld via de Wensen & Bugs module" },
    ],
  },
  {
    version: "1.10",
    date: "8 maart 2026",
    title: "Wensen & Bugs, Backup & Overboekingen",
    changes: [
      { type: "feature", text: "Wensen & Bugs module: gebruikers kunnen wensen en bugs indienen en erop stemmen" },
      { type: "feature", text: "Backup & Herstel: volledige account-backup downloaden als JSON en weer importeren" },
      { type: "feature", text: "Overboekingen: tegenrekening selecteren bij transacties met type Overboeking" },
      { type: "improvement", text: "Overboekingen tonen nu de naam van de tegenrekening in het transactieoverzicht" },
      { type: "improvement", text: "Gekoppelde tegentransactie wordt automatisch mee-geüpdatet bij bewerken" },
    ],
  },
  {
    version: "1.09",
    date: "8 maart 2026",
    title: "Landing page, Demo & Transactie fixes",
    changes: [
      { type: "feature", text: "Publieke landing page met hero en features overzicht voor niet-ingelogde bezoekers" },
      { type: "feature", text: "Interactieve demo met fictieve data — alle pagina's volledig navigeerbaar" },
      { type: "feature", text: "Demo bevat Dashboard, Transacties, Gepland, Contacten, Budget, Rapporten, Import, Versies en Instellingen" },
      { type: "fix", text: "Geplande transacties die al betaald zijn worden niet meer getoond op de transactiepagina" },
      { type: "improvement", text: "Dashboard toont standaard 10 transacties per pagina (aanpasbaar)" },
      { type: "improvement", text: "Rapporten bevatten nu ook geplande transacties en budgetoverzicht" },
    ],
  },
  {
    version: "1.08",
    date: "8 maart 2026",
    title: "Saldo, Kleuren & Geplande fixes",
    changes: [
      { type: "fix", text: "Pie chart kleuren zijn nu altijd uniek per categorie" },
      { type: "fix", text: "Balans kaart toont nu het totale saldo van alle bankrekeningen" },
      { type: "fix", text: "Geplande uitgaven per rekening houden nu rekening met reeds betaalde items" },
      { type: "fix", text: "Maandelijkse geplande transacties op dag 1 maken niet meer dubbele entries aan" },
      { type: "improvement", text: "Maandelijkse herhalingen gebruiken nu een vaste dag-van-de-maand i.p.v. 30-dagen intervallen" },
    ],
  },
  {
    version: "1.07",
    date: "8 maart 2026",
    title: "Categorievolgorde, Subcategorieën & Overboekingen",
    changes: [
      { type: "feature", text: "Categorieën herordenen via drag & drop in instellingen" },
      { type: "feature", text: "Categorievolgorde wordt overgenomen in alle dropdowns en overzichten" },
      { type: "feature", text: "Subcategorieën duidelijk zichtbaar in dropdowns en rapportages (met └ prefix)" },
      { type: "feature", text: "Overboekingen maken nu twee gekoppelde transacties aan op beide bankrekeningen" },
      { type: "improvement", text: "Transactie bewerken: groter dialoog met duidelijke veldlabels" },
      { type: "improvement", text: "Menu: Gepland staat nu direct onder Transacties voor betere zichtbaarheid" },
      { type: "improvement", text: "Geplande transacties worden nu onbeperkt doorgezet in de toekomst (24 maanden)" },
      { type: "improvement", text: "Uitgaven per categorie in rapporten toont subcategorieën gegroepeerd onder hoofdcategorie" },
    ],
  },
  {
    version: "1.06",
    date: "8 maart 2026",
    title: "Geplande transacties, Filters & Categorieën",
    changes: [
      { type: "feature", text: "Geplande transacties aanmaken met frequentie: eenmalig, wekelijks, maandelijks of per kwartaal" },
      { type: "feature", text: "Toekomstige herhalingen van geplande transacties worden automatisch getoond" },
      { type: "feature", text: "Banktransacties koppelen aan geplande transacties om betaalstatus te zien" },
      { type: "feature", text: "Startsaldo bij bankrekeningen voor correcte saldoweergave" },
      { type: "feature", text: "Eigen categorieën en subcategorieën aanmaken in instellingen" },
      { type: "feature", text: "Transactiepagina: uitgebreide filters op maand, rekening, categorie en contact" },
      { type: "feature", text: "Transactiepagina: zoekfunctie op omschrijving en bedrag" },
      { type: "improvement", text: "Saldoweergave houdt nu rekening met startsaldo van de rekening" },
      { type: "improvement", text: "Geplande pagina toont betaald/onbetaald status" },
    ],
  },
  {
    version: "1.05",
    date: "7 maart 2026",
    title: "ING fix, Geplande transacties & MyBanksFlow",
    changes: [
      { type: "fix", text: "ING import: omschrijving, mededelingen, tegenrekening en contacten worden nu correct ingelezen" },
      { type: "feature", text: "Applicatie hernoemd van FinTrack naar MyBanksFlow.com" },
      { type: "feature", text: "Geplande transacties: markeer transacties als gepland en zie wat er nog betaald moet worden" },
      { type: "feature", text: "Dashboard toont saldo per bankrekening met openstaande geplande uitgaven" },
      { type: "feature", text: "Transactietype 'Overboeking' is nu beschikbaar bij bewerken en toevoegen" },
      { type: "improvement", text: "Bankrekeningen gegroepeerd per type (betaal, spaar, belegging, etc.) in instellingen" },
      { type: "improvement", text: "Alle velden van bankrekeningen zijn nu bewerkbaar" },
      { type: "improvement", text: "Geplande pagina toont nu echte transacties i.p.v. demodata" },
    ],
  },
  {
    version: "1.04",
    date: "6 maart 2026",
    title: "Rekening types, Overboekingen & Rapporten",
    changes: [
      { type: "feature", text: "Rekeningtype bij bankrekeningen (betaal, spaar, belegging, creditcard, deposito)" },
      { type: "feature", text: "Nieuw transactietype: interne overboekingen tussen eigen rekeningen" },
      { type: "feature", text: "Interne overboekingen worden uitgesloten van alle overzichten" },
      { type: "feature", text: "Nieuwe Rapporten pagina met filters op rekening, categorie en contact" },
      { type: "feature", text: "Saldoverloop grafiek in rapporten" },
      { type: "improvement", text: "Uitgaven per categorie met voortgangsbalk in rapporten" },
    ],
  },
  {
    version: "1.03",
    date: "15 februari 2026",
    title: "Admin & Budget",
    changes: [
      { type: "feature", text: "Admin pagina met gebruikersoverzicht (alleen voor beheerders)" },
      { type: "feature", text: "Rolgebaseerde toegang met admin-rollen" },
      { type: "feature", text: "Budgetten toevoegen per categorie of per contact" },
      { type: "feature", text: "Alle transacties in één keer verwijderen" },
      { type: "improvement", text: "Uitgaven per categorie grafiek in 3D-stijl" },
      { type: "improvement", text: "Versienummer zichtbaar onderaan het menu" },
    ],
  },
  {
    version: "1.02",
    date: "15 februari 2026",
    title: "Dashboard verbeteringen",
    changes: [
      { type: "feature", text: "Jaaroverzicht naast maandoverzicht op het dashboard" },
      { type: "feature", text: "Zoekfunctie op transacties in het dashboard (naam, bedrag, beschrijving)" },
      { type: "feature", text: "Paginering bij transacties op het dashboard (10 per pagina)" },
      { type: "improvement", text: "Cash flow grafiek in 3D-stijl met gradiënten en schaduwen" },
      { type: "improvement", text: "Vergelijking met vorig jaar bij jaaroverzicht" },
    ],
  },
  {
    version: "1.01",
    date: "15 februari 2026",
    title: "Eerste release",
    changes: [
      { type: "feature", text: "Dashboard met overzicht van inkomsten, uitgaven en balans" },
      { type: "feature", text: "CSV-import voor ASN Bank, ING en Revolut" },
      { type: "feature", text: "Automatische categorisatie op basis van keywords" },
      { type: "feature", text: "Contactbeheer met IBAN-koppeling" },
      { type: "feature", text: "Bankrekeningen beheer" },
      { type: "feature", text: "Budgetbeheer per categorie per maand" },
      { type: "feature", text: "Duplicaatdetectie bij importeren" },
      { type: "feature", text: "Gebruikers-specifieke categorisatieregels" },
      { type: "improvement", text: "Banknaam zichtbaar bij recente transacties op dashboard" },
      { type: "fix", text: "Duplicaatdetectie verbeterd met .limit(1) in plaats van .maybeSingle()" },
    ],
  },
];

const typeBadge = (type: Release["changes"][0]["type"]) => {
  switch (type) {
    case "feature":
      return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Nieuw</Badge>;
    case "fix":
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Fix</Badge>;
    case "improvement":
      return <Badge className="bg-accent/50 text-accent-foreground border-accent text-[10px]">Verbeterd</Badge>;
  }
};

export default function Changelog() {
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Versies</h1>
        <p className="text-sm text-muted-foreground">Changelog en release-overzicht</p>
      </div>
      <div className="space-y-8">
        {RELEASES.map((release) => (
          <div key={release.version} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold">v{release.version}</h2>
              <Badge variant="outline" className="text-xs">{release.title}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{release.date}</p>
            <Separator className="mb-4" />
            <ul className="space-y-2.5">
              {release.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  {typeBadge(change.type)}
                  <span className="text-muted-foreground">{change.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
