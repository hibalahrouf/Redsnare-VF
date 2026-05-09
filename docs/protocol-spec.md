# Specifications du Protocole

## 1. Flux Nominal
L'utilisateur s'identifie avec un wallet (`Wagmi/Viem`).
- L'organisation appelle `createBounty(...)` pour configurer le smart contract `BugBountyPlatform`.
- Puis `fundBounty(...)` où une quantité stochastique minimale (Ex: `5000 USDC`) est verrouillée sur le contrat `Escrow`.
- Le chercheur soumet un hash via `submitReport(...)` assorti de la somme stakée définie.

## 2. Système Anti-SPAM
- Le `baseStake` est fixé en tokens stables et augmente l'incitation financière des fraudeurs. Si malveillant, le montant envoyé vers `StakeManager` subit un slash en faveur du `treasury`.

## 3. Comités et Délégation
- Chaque _Bounty_ définit N membres du comité avec un seuil `K`.
- Les votes se font hors-chaîne pour le contenu, on-chaîne pour les jetons de `voteReport()`.

## 4. Phase Commit / Reveal
- La limite de vote passée, si litige (appel de `raiseDispute()`), la méthode `DisputeModule.commitVote` prend le relais.
- Le Reveal impose une clef secrète (`salt`).
- `resolveDispute` libère finalement l'attente vers l'état _Accepted_ ou _Rejected_ afin de calculer publiquement/de manière immutabilisée la _Réputation_.
