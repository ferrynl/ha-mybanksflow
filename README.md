# MyBanksFlow als Home Assistant-app

Deze extra uitgave draait volledig lokaal: financiën, login en contractbestanden staan op je Home Assistant-machine. De bestaande Cloud- en VPS-installaties blijven onafhankelijk bestaan. Installeren en updates downloaden vereisen internet; dagelijks gebruik niet.

## Geschikt voor

- Home Assistant OS met de Apps-/Add-ons-winkel, op **amd64/x86-64**.
- Minimaal 4 GB geheugen aanbevolen en voldoende vrije schijfruimte voor database, bestanden en back-ups.
- Home Assistant Container/Core zonder Supervisor kan geen apps installeren; gebruik daar de bestaande VPS-installatie.
- Raspberry Pi/ARM is in deze eerste uitgave **niet ondersteund**.

## Eenmalig: installatierepository klaarzetten

De installatierepository voor deze uitgave is **https://github.com/ferrynl/ha-mybanksflow**. Gebruik deze URL in Home Assistant zodra de installatiebestanden daar zijn geplaatst. Voor volgende uitgaven maak je vanuit de broncode de zelfstandige repository:

```bash
python3 homeassistant/package.py /tmp/mybanksflow-ha
```

Het script kopieert uitsluitend de benodigde broncode en installatiebestanden, zonder sleutels, `.env`, repositorygegevens of bestaande gebruikersdata. Zet de **inhoud** van deze map in `ferrynl/ha-mybanksflow`. Op het hoogste niveau moeten `repository.yaml` en de map `mybanksflow` staan.

Een alternatief is de gegenereerde map `mybanksflow` te kopiëren naar `/addons/mybanksflow` op Home Assistant voor een lokale installatieproef. Dit alternatief ontdekt geen repository-updates automatisch.

## Installatie in Home Assistant

1. Open **Instellingen → Apps** (in oudere versies **Add-ons**) → winkel → menu → **Repositories**.
2. Voeg **https://github.com/ferrynl/ha-mybanksflow** toe en vernieuw de winkel.
3. Open **MyBanksFlow** en kies **Installeren**. De eerste installatie bouwt de app op de machine; dit kan enkele minuten duren.
4. Vul onder **Configuratie** `admin_email` en `admin_password` in. Gebruik een uniek wachtwoord van **minimaal 12 tekens**.
5. Sla op, zet **Starten bij opstarten** en **Weergeven in zijbalk** aan en kies **Starten**.
6. Open de webinterface en log in met dat e-mailadres en wachtwoord.

Database, toegangsrechten, versleutelingssleutel en account worden automatisch aangemaakt. Openbare registratie staat uit. Er zijn geen Cloud-sleutels, Docker-instellingen of SMTP-gegevens nodig. De app krijgt geen toegang tot de Docker-socket; beschermingsmodus kan aan blijven staan.

De configuratiegegevens bepalen het eerste account. Later aanpassen van `admin_email`/`admin_password` verandert het bestaande account **niet**. Bewaar het gekozen wachtwoord in een wachtwoordmanager. Bij een verloren wachtwoord is voorlopig lokale beheerdershulp nodig; er is geen e-mailherstel ingesteld.

## Gegevens meenemen

Maak in de bestaande MyBanksFlow-installatie via **Instellingen → Backup & Herstel** een account-back-up en herstel deze in de lokale installatie. Deze account-export is geen volledige back-up van de installatie; neem contractbestanden en accounts apart mee waar de export deze niet bevat. Controleer na herstel rekeningen, transacties, contracten en uploads.

## Updates

Updates gebruiken Home Assistants normale app-updatevoorziening, niet de VPS-updater.

Voor de beheerder van de installatierepository:

1. Werk de broncode bij en voeg nieuwe lokale schemawijzigingen toe als een **nieuw** genummerd bestand in `rootfs/opt/mybanksflow/migrations/`.
2. Verander nooit een reeds gebruikte migratie. De app controleert de inhoud en weigert op te starten als die achteraf gewijzigd is. De eerste `001_initial.sql` is vastgezet en wordt bij vervolguitgaven niet opnieuw gegenereerd uit de VPS-schema-bron.
3. Verhoog het versienummer in `mybanksflow/config.yaml`, de standaard `BUILD_VERSION` in de Dockerfile en de changelog.
4. Maak met `package.py` een nieuwe installatiemap en plaats deze in dezelfde GitHub-repository.
5. Test de nieuwe uitgave eerst op een testinstallatie en test een volledige back-up/restore.

Voor de gebruiker:

1. Maak **voor iedere update** een volledige Home Assistant-back-up met MyBanksFlow inbegrepen.
2. Vernieuw de winkel/repositories; Home Assistant toont de update zodra de repositoryversie hoger is.
3. Kies **Bijwerken**. Gegevens onder `/data` blijven behouden, sleutels worden niet opnieuw gemaakt en nieuwe schemawijzigingen worden vóór het openen toegepast.
4. Automatisch bijwerken kan via Home Assistant worden aangezet als jouw versie dit aanbiedt. Dat publiceert geen nieuwe releases: de beheerder moet eerst een geteste repositoryversie beschikbaar maken.

Terug naar een oude app-versie draaien is **geen** databaseherstel. Herstel bij een mislukte update de volledige back-up van vóór de update.

## Back-up en verwijderen

De app gebruikt **koude back-ups**: Home Assistant stopt de app tijdens de back-up, zodat database, bestanden en sleutels samen worden bewaard. Bewaar back-ups buiten de Home Assistant-machine en test herstel.

Bij verwijderen van de app kan Home Assistant de appgegevens verwijderen. Maak eerst een volledige back-up. Verwijder nooit alleen `secrets.json`; zonder deze gegevens kan een bestaande database niet veilig worden gestart.

## Veiligheid en beperkingen

- Alleen Home Assistant-ingress is toegankelijk; er worden geen database- of webpoorten op het thuisnetwerk gepubliceerd.
- De interface is standaard voor Home Assistant-beheerders. Een Home Assistant-login is geen MyBanksFlow-login.
- Administratieve gegevens worden uitsluitend na een servercontrole van de accountrol getoond.
- Gevoelige transactiedetails worden op kolomniveau versleuteld; bedragen en omschrijvingen voor zoeken blijven leesbaar. De sleutel staat op dezelfde machine: dit beschermt niet tegen een aanvaller die een volledige back-up of de hele machine bezit.
- Er is geen live-update-dienst nodig voor de huidige app; deze uitgave bevat geen Realtime of Studio.
- De lokale diensten hebben vaste softwareversies. Controleer beveiligingsupdates bij nieuwe uitgaven.

## Wat is gecontroleerd?

De verpakking, blijvende sleutels en configuratiecontroles worden automatisch getest. De volledige lokale app-schema-inrichting is op een tijdelijke PostgreSQL 15-database met alle 25 opslagmigraties toegepast. Accountafscherming, automatisch aangemaakte profielen en behoud van versleutelde details na een wijziging zijn daar getest. **Een echte Home Assistant-installatie, cold backup/restore en een complete containeropstart zijn in de ontwikkelomgeving nog niet geverifieerd.** Beschouw deze eerste uitgave als een installatiekandidaat; voer eerst onderstaande acceptatieproef uit voordat je je enige financiële administratie verplaatst.

De herhaalbare databaseproef staat in `homeassistant/security_smoke.sql` in de bronrepository en mag uitsluitend tegen een tijdelijke, geïnitialiseerde lokale testdatabase worden uitgevoerd.

### Acceptatieproef

- Installeren op amd64 met beschermingsmodus aan.
- Openen vanuit Home Assistant, inloggen, een rekening toevoegen en een CSV importeren; na herstart dezelfde transacties terugzien.
- Contract maken, PDF uploaden, downloaden en opnieuw openen na herstart.
- Een tweede testaccount mag geen gegevens of contractbestanden van de beheerder lezen; onbevoegde admin-aanroepen geven 401/403.
- Een volledige back-up herstellen op een lege testinstallatie en de PDF plus bedragen terugzien.
- Update met een nieuw migratiebestand uitvoeren, opnieuw inloggen en bestaande gegevens controleren.

## Als starten niet lukt

Controleer de app-log op de veilige opstartmelding en controleer je configuratie. Controleer vrije schijfruimte en architectuur. Deel geen wachtwoorden, `secrets.json` of databasebestanden in logs. De app stopt als een dienst uitvalt of een migratie niet klopt; herstel de vorige volledige back-up en test de uitgave op een aparte installatie.