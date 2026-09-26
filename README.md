# Croissant-Katapult voor het digibord

Lokaal bordspel voor twee of drie groepen. Elke groep schiet op drie ballonnen en krijgt dezelfde willekeurig gekozen vragen in een eigen volgorde. De voortgang loopt alleen op na een juist antwoord.

Kies vooraf een woordenreeks, het soort vragen, de vertaalrichting en het aantal oefeningen. Dat aantal wordt willekeurig uit de gekozen reeks gehaald, zonder herhalingen. Trek het brood in de katapult naar beneden en laat los om te schieten. Met de knop **Spelmenu** kun je tijdens het spelen pauzeren, het geluid aanpassen of een nieuw spel beginnen.

Duiven zijn optioneel. Een schot dat niets raakt, lokt één extra duif. Een fout getroffen antwoordballon verdwijnt voor de rest van die vraag en lokt twee extra duiven. Een duif met stinkkaas raken verjaagt haar; een duif met stokbrood of croissant raken lokt twee extra duiven. Als duiven uitstaan, verdwijnen ook de stinkkaas en de extra duiven door misschoten en foute antwoorden.

Het geluid bestaat uit korte effecten en drie eenvoudige Franse zinnen: bij nog één vraag te gaan, na drie juiste antwoorden op rij en na een duif die met brood of croissant geraakt wordt. Gelijktijdige gesproken meldingen worden niet opgestapeld. De Franse uitspraak gebruikt de spraakstem van de browser of het toestel; controleer die stem op het digibord. Op het eindscherm klinkt één korte fanfare.

Wanneer alle groepen klaar zijn, verschijnt een schermvullend podium met de aankomstvolgorde, confetti en voorbijvliegende duiven. Daar kun je meteen opnieuw spelen of de instellingen aanpassen.

## Lokaal starten

```sh
npm install
npm run dev
```

Open het adres dat Vite toont. Voor een productieversie: `npm run build`.

De woordenbank in `src/vocab.json` is overgenomen uit `croissant_katapult_frans_vocabulaire.html` in de map `Frans vocabulaire`. Ze bevat 18 contacten en 600 vragen. De app werkt zonder backend of externe assets.

De oorspronkelijke getekende vormen van de katapult, ballonnen, projectielen en duif zijn in de Canvas-weergave behouden. In de bronapp waren het Canvas-vectorvormen, geen losse SVG-bestanden.

De interface is bedoeld voor een liggend multitouchbord. Controleer de uiteindelijke bediening op het echte i3CONNECT ELM 2, ook bij de gebruikte browserzoom en schermschaling.
