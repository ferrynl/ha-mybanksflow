// Keyword-based auto-categorization for Dutch bank transactions
// Maps category names to keyword patterns (lowercase)
// Used as fallback when no user-specific rule exists

export interface KeywordRule {
  categoryName: string;
  keywords: string[];
}

export const CATEGORIZATION_KEYWORDS: KeywordRule[] = [
  // Wonen
  {
    categoryName: "Wonen",
    keywords: [
      "huur", "hypotheek", "woonhave", "woningcorporatie", "vve", "servicekosten",
      "gemeentebelasting", "waterschapsbelasting", "rioolheffing", "afvalstoffenheffing",
      "eneco", "vattenfall", "essent", "greenchoice", "budget energie", "energie",
      "nuon", "gas", "elektra", "stroom", "warmte", "stadsverwarm",
      "ziggo", "kpn", "t-mobile", "vodafone", "tele2", "internet", "glasvezel",
      "woning", "vastgoed", "makelaardij", "woondiensten",
    ],
  },
  // Boodschappen
  {
    categoryName: "Boodschappen",
    keywords: [
      "albert heijn", "jumbo", "lidl", "aldi", "plus", "coop", "dirk",
      "dekamarkt", "spar", "vomar", "hoogvliet", "nettorama", "boni",
      "picnic", "crisp", "supermarkt", "superunie", "ekoplaza",
      "action", "kruidvat", "trekpleister", "etos", "hema",
    ],
  },
  // Vervoer
  {
    categoryName: "Vervoer",
    keywords: [
      "ns ", "ns.nl", "arriva", "connexxion", "ov-chipkaart", "translink",
      "qbuzz", "ret ", "gvb", "htm", "breng", "u-ov",
      "shell", "bp ", "total", "esso", "tinq", "tango", "gulf", "tankstation",
      "benzine", "diesel", "brandstof", "laadpaal", "fastned", "allego",
      "anwb", "rdw", "wegenbelasting", "motorrijtuigenbelasting",
      "parkeren", "q-park", "p1 parking", "apcoa",
      "swapfiets", "greenwheels", "mywheels", "sixt", "hertz", "europcar",
    ],
  },
  // Eten & Drinken
  {
    categoryName: "Eten & Drinken",
    keywords: [
      "thuisbezorgd", "deliveroo", "uber eats", "ubereats", "domino",
      "mcdonalds", "mcdonald", "burger king", "subway", "kfc",
      "starbucks", "coffee company", "bagels & beans",
      "restaurant", "eetcafe", "bistro", "pizzeria", "sushi",
      "febo", "new york pizza", "spare rib",
    ],
  },
  // Entertainment
  {
    categoryName: "Entertainment",
    keywords: [
      "netflix", "spotify", "disney+", "disney plus", "videoland", "hbo",
      "amazon prime", "apple tv", "youtube", "twitch",
      "pathe", "vue cinema", "kinepolis", "bioscoop",
      "bol.com", "coolblue", "mediamarkt", "playstation", "xbox", "steam", "nintendo",
      "ticketmaster", "eventim", "concert", "theater", "museum",
    ],
  },
  // Gezondheid
  {
    categoryName: "Gezondheid",
    keywords: [
      "apotheek", "huisarts", "tandarts", "fysiotherap", "psycholoog",
      "ziekenhuis", "specialist", "oogarts", "dermatoloog",
      "drogist", "vitamines", "supplement",
      "sportschool", "fitness", "basic-fit", "anytime fitness", "fit for free",
      "gym", "yoga", "pilates",
    ],
  },
  // Kleding
  {
    categoryName: "Kleding",
    keywords: [
      "h&m", "zara", "primark", "c&a", "uniqlo", "wibra",
      "zalando", "about you", "asos", "nike", "adidas", "puma",
      "schoenen", "scapino", "van haren", "bristol",
      "only", "jack & jones", "we fashion", "scotch & soda",
    ],
  },
  // Abonnementen
  {
    categoryName: "Abonnementen",
    keywords: [
      "abonnement", "lidmaatschap", "contributie", "maandelijks",
      "adobe", "microsoft", "google storage", "icloud", "dropbox",
      "chatgpt", "openai", "elbuco", "service care",
      "nos", "volkskrant", "telegraaf", "nrc", "trouw", "ad.nl", "fd.nl",
      "blendle", "de correspondent",
    ],
  },
  // Verzekeringen
  {
    categoryName: "Verzekeringen",
    keywords: [
      "verzekering", "zorgverzekering", "zilveren kruis", "cz ", "menzis",
      "vgz", "unive", "ohra", "interpolis", "nationale nederlanden",
      "achmea", "aegon", "allianz", "asr ", "centraal beheer",
      "inboedelverzekering", "aansprakelijkheid", "reisverzekering",
      "premie", "polis",
    ],
  },
  // Salaris
  {
    categoryName: "Salaris",
    keywords: [
      "salaris", "loon", "salarisbet", "salary", "nettoloon",
      "uitkering", "uwv", "toeslagen", "belastingdienst teruggave",
      "ww-uitkering", "bijstand",
    ],
  },
  // Investering
  {
    categoryName: "Investering",
    keywords: [
      "degiro", "binck", "saxo", "trading", "belegging", "dividend",
      "rente", "spaarrente", "deposito",
      "crypto", "bitcoin", "bitvavo",
    ],
  },
];

/**
 * Find the best matching category name based on keywords in the description.
 * Returns the category name or null if no match found.
 */
export function matchCategoryByKeywords(
  description: string,
  originalDescription?: string | null
): string | null {
  const searchText = [description, originalDescription ?? ""]
    .join(" ")
    .toLowerCase();

  for (const rule of CATEGORIZATION_KEYWORDS) {
    for (const keyword of rule.keywords) {
      if (searchText.includes(keyword)) {
        return rule.categoryName;
      }
    }
  }

  return null;
}
