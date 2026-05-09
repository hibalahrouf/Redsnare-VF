# Modèle de Menaces (Threat Model)

Ce document énumère les vecteurs d'attaque potentiels et les mitigations natives intégrées:

## 1. SPAM / DOS sur les serveurs du Comité
**Description**: De faux rapports bloquent la file d'attente du comité.
**Atténuation**: Chaque soumission oblige de staker (déposer) de l'USDC via `StakeManager.sol`. Tout rejet entraîne un _slash_ (confiscation) automatique au profit de la Trésorerie. L'incitation économique décourage le SPAM.

## 2. Manipulation de Vote par les Pairs (Sybille ou Pression)
**Description**: Des membres de comité copient ou manipulent les votes avant la clôture.
**Atténuation**: Un vote `Commit / Reveal` masque l'intention réelle du votant via des empreintes cryptographiques avec sel (Salt) afin d'imposer un secret temporaire jusqu'à exécution finale (Via `DisputeModule.sol`).

## 3. Compromission des données du Zero-day (Fuite)
**Description**: Une vulnérabilité est lue publiquement et exploitée avant patch.
**Atténuation**: Les payloads sont chiffrés **Côté Client** avec l'API WebCrypto (`AES-GCM`) via `frontend/services/encryption.ts`, et les CIDs IPFS sont injectés sur la blockchain. Oracles et votants échangent uniquement de manière sécurisée ou hors-chaîne pour le déchiffrage.

## 4. Attaques classiques (Reentrancy, Arithmetic Overflows)
**Description**: Exploitation de bugs d'ingénierie Smart Contract.
**Atténuation**: Utilisation stricte de la version `>=0.8.20` de Solidity, module `ReentrancyGuard.sol` et module `SafeERC20.sol` pour interagir préventivement.
