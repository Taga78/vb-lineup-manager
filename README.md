# VB-lineup-manager
Gestionnaire de compositions d’équipes pour club de volley : suivi des joueurs, niveaux définis par le staff, création de séances et répartition automatique des joueurs sur les terrains, 100 % mobile-first.

L’objectif principal est de permettre au staff d’un club de volley de :
- gérer les joueurs et leurs niveaux (définis uniquement par le staff),
- enregistrer les présences à chaque séance (via QR code ou lien partagé),
- adapter le nombre de terrains disponibles,
- générer des équipes équilibrées en niveau, en tenant compte si possible de la mixité,
- s’assurer que tous les joueurs présents jouent (équipes de 3 à 6 joueurs, tailles éventuellement différentes).

Ce projet sert à la fois de **solution concrète pour un club** et de **projet portfolio** pour démontrer des compétences fullstack modernes.

---

## Fonctionnalités

- ✅ Gestion des joueurs (nom, genre, niveau, statut actif/inactif)
- ✅ Gestion des séances d’entraînement (date, nombre de terrains, taille d’équipe préférée)
- ✅ Déclaration de présence des joueurs via smartphone
- ✅ Interface staff pour :
  - visualiser les présents,
  - ajuster les niveaux,
  - modifier le nombre de terrains,
  - lancer la génération d’équipes
- ✅ Algorithme d’équilibrage :
  - priorité à l’équilibre de niveau,
  - respect d’un intervalle de 3 à 6 joueurs par équipe,
  - tous les joueurs présents sont placés dans une équipe.
- 🔜 Amélioration de la mixité et prise en compte de l’historique (éviter que les mêmes joueurs jouent toujours ensemble)
- 🔜 Mode PWA pour installation sur l’écran d’accueil du smartphone

---

## Stack technique

- **Frontend**
  - [Next.js 15](https://nextjs.org/) (App Router)
  - [React](https://react.dev/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)

- **Backend & Base de données**
  - [Supabase](https://supabase.com/) (PostgreSQL managé + Auth + Row Level Security)
  - Accès à la base via le client JavaScript `@supabase/supabase-js`
  - Logique métier (génération d’équipes) implémentée côté serveur (Route Handlers / Server Actions / Edge Functions)

- **Hébergement**
  - Frontend : Vercel (ou équivalent)
  - Base & Auth : Supabase (free tier)

---

## Prérequis

- Node.js (version LTS recommandée)
- npm ou pnpm
- Un compte [Supabase](https://supabase.com/) (gratuit)
- Un compte [Vercel](https://vercel.com/) (optionnel pour le déploiement)

---

## Installation et démarrage

1. **Cloner le dépôt**

   ```bash
   git clone https://github.com/<ton-compte-github>/volleyball-team-balancer.git
   cd volleyball-team-balancer
