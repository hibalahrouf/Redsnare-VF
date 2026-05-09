# Architecture de la Plateforme Bug Bounty Décentralisée

## 1. Vue d'Ensemble
La plateforme repose sur deux couches principales:
- **On-chain (EVM L2 - Arbitrum Sepolia)**: Contrats gérant la caution (stake), la récompense (escrow USDC), les votes du comité et la résolution des litiges.
- **Off-chain (IPFS + Frontend Web3)**: Application React/Next.js stockant les métadonnées chiffrées sur IPFS.

## 2. Smart Contracts Modulaires
Le système a été modularisé pour améliorer la sécurité et la clarté:
- `BugBountyPlatform`: Le point d'entrée principal.
- `Escrow`: Module sécurisé de verrouillage des USDCs de récompense (Anti-reentrancy).
- `StakeManager`: Verrouille les jetons des chercheurs pour limiter le SPAM, et les transfère à une Trésorerie en cas de rejet.
- `DisputeModule`: Permet de traiter les appels avec un vote (commit/reveal) à l'aveugle par le comité K-sur-N.
- `Reputation`: Construit l'historique de fiabilité des participants au protocole.

## 3. Workflow de Base
1. L'organisation (Owner) crée un contrat et finance l'Escrow depuis le Frontend.
2. Le chercheur chiffre la demande localement et l'upload sur IPFS.
3. Le chercheur soumet le CID + Stake sur la blockchain, initialisant la période d'étude.
4. Le comité peut accepter ou refuser la demande et/ou faire appel.
