# Module devis B2B

## Objectif

Le module devis B2B isole les demandes de devis dans des tables dediees, sans melanger les devis avec les bons de commande (`F_DOCENTETE` / `F_DOCLIGNE`) ni avec les bons de livraison. Le flux existant `BC -> BL` reste inchangé : un devis accepte genere un BC, puis le confirmateur continue a transformer le BC en BL avec les endpoints existants.

## Tables ajoutees

- `F_DEVIS_ENTETE` : entete du devis, client B2B, statut, totaux snapshot, remise snapshot, validite, confirmateur assigne, lien `BcPiece`.
- `F_DEVIS_LIGNE` : lignes article du devis avec prix, quantite, remise ligne et montants snapshot.
- `F_DEVIS_EVENT` : historique complet des commentaires et changements de statut, avec distinction commentaire public/interne.

Migration ajoutee : `20260526120000_AddProfessionalDevisTables`.

## Etats metier

`BROUILLON`, `SOUMIS`, `EN_ETUDE`, `INFO_MANQUANTE`, `REPONSE_CLIENT`, `MODIFIE`, `VALIDE`, `ENVOYE_CLIENT`, `ACCEPTE_CLIENT`, `REFUSE_CLIENT`, `EXPIRE`, `CONVERTI_BC`, `ANNULE`.

Le statut initial d'une demande client B2B est `SOUMIS`. Le client ne peut accepter qu'un devis `ENVOYE_CLIENT`. Apres acceptation, le backend verifie le stock et cree automatiquement un BC, puis passe le devis a `CONVERTI_BC`.

## Endpoints principaux

Client B2B :

- `GET /api/b2b/devis`
- `POST /api/b2b/devis`
- `GET /api/b2b/devis/{piece}`
- `POST /api/b2b/devis/{piece}/comments`
- `POST /api/b2b/devis/{piece}/accept`
- `POST /api/b2b/devis/{piece}/reject`

Confirmateur :

- `GET /api/confirmateur/devis`
- `GET /api/confirmateur/devis/{piece}`
- `POST /api/confirmateur/devis/{piece}/take`
- `PUT /api/confirmateur/devis/{piece}/status`
- `PUT /api/confirmateur/devis/{piece}/lines`
- `POST /api/confirmateur/devis/{piece}/comments`
- `POST /api/confirmateur/devis/{piece}/send-to-client`
- `POST /api/confirmateur/devis/{piece}/cancel`

Les anciennes routes `/api/b2b/quotes` restent compatibles pour les ecrans deja existants.

## Regles importantes

- Les devis sont reserves aux profils client `B2B`.
- Les montants envoyes par le frontend ne sont pas acceptes : prix, remise B2B et totaux sont recalcules cote backend.
- La remise B2B courante est stockee dans `DiscountPercentSnapshot`; les modifications futures de remise client ne changent pas les anciens devis.
- Les commentaires internes (`IsPublic=false`) sont retournes uniquement aux profils internes, jamais au client.
- Un devis converti, refuse, expire ou annule ne peut plus etre modifie.
- Le stock n'est pas reserve a la creation du devis. Il est verifie au moment de l'acceptation/conversion.
- Un deuxieme clic sur accepter ne cree pas un second BC : le backend retourne le BC deja lie.

## Tests executes

- `dotnet restore backend-aspnet-api/Web-Api/Web-Api.csproj`
- `dotnet build backend-aspnet-api/Web-Api/Web-Api.csproj --no-restore -p:UseAppHost=false -p:BaseOutputPath=C:\PROJET-PFE\.codex-build\backend\`
- `dotnet test backend-aspnet-api/Web-Api.Tests/Web-Api.Tests.csproj --no-restore -p:UseAppHost=false -p:BaseOutputPath=C:\PROJET-PFE\.codex-build\tests\`
- `npm run build`
- `npx eslint` sur les fichiers frontend touches

`npm run lint` global echoue encore sur de la dette existante hors module devis (`any`, hooks setState in effect, purity rules, etc.).
