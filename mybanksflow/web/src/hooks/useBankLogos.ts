import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import bankIngLogo from "@/assets/bank-ing.png";
import bankAbnLogo from "@/assets/bank-abnamro.png";
import bankRaboLogo from "@/assets/bank-rabobank.png";
import bankAsnLogo from "@/assets/bank-asn.png";
import bankRevolutLogo from "@/assets/bank-revolut.png";
import bankTriodosLogo from "@/assets/bank-triodos.png";
import bankKnabLogo from "@/assets/bank-knab.png";
import bankBunqLogo from "@/assets/bank-bunq.png";
import bankN26Logo from "@/assets/bank-n26.png";
import bankSnsLogo from "@/assets/bank-sns.png";
import bankRegioLogo from "@/assets/bank-regiobank.png";

const LOCAL_LOGOS: Record<string, string> = {
  ing: bankIngLogo, abnamro: bankAbnLogo, rabobank: bankRaboLogo,
  asn: bankAsnLogo, revolut: bankRevolutLogo, triodos: bankTriodosLogo,
  knab: bankKnabLogo, bunq: bankBunqLogo, n26: bankN26Logo,
  sns: bankSnsLogo, regiobank: bankRegioLogo,
};

const BANK_IDS = Object.keys(LOCAL_LOGOS);

export function useBankLogos() {
  const [logos, setLogos] = useState<Record<string, string>>(LOCAL_LOGOS);

  useEffect(() => {
    const check = async () => {
      const updated = { ...LOCAL_LOGOS };
      for (const bankId of BANK_IDS) {
        const { data } = supabase.storage.from("bank-logos").getPublicUrl(`${bankId}.png`);
        try {
          const res = await fetch(data.publicUrl, { method: "HEAD" });
          if (res.ok) updated[bankId] = data.publicUrl;
        } catch {}
      }
      setLogos(updated);
    };
    check();
  }, []);

  return logos;
}
