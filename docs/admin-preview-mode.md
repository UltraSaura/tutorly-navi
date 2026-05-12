# Admin Preview Mode

## Objectif

Le mode aperçu élève permet à un admin de voir les surfaces étudiant comme si le niveau actif était CP, CE1, CE2, CM1, CM2, 6eme, 5eme, 4eme ou 3eme, sans se reconnecter avec un compte élève.

## Fonctionnement

- Le choix est stocké uniquement dans `localStorage` avec la clé `admin_preview_level`.
- Le profil utilisateur en base n'est jamais modifié.
- Le niveau actif est résolu par `useActiveSchoolLevel` :
  - admin + niveau aperçu -> niveau aperçu ;
  - sinon niveau réel du profil ;
  - sinon source `default`.
- Le sélecteur "Voir comme" est visible uniquement pour les admins.
- Un bandeau indique clairement le mode actif et permet de quitter l'aperçu.

## Pages impactées

- `/practice`
- `/practice/:subject`
- `/practice/:subject/annales`
- `/practice/session`
- pages Learning qui utilisent les filtres de niveau/curriculum
- quiz utilisant les hooks de banques/attempts

## Limites

- Le mode ne crée pas de faux élève.
- Le mode ne simule pas les historiques, scores, progrès ou tentatives d'un élève réel.
- Si un contenu dépend d'un pays de curriculum et que le profil admin n'en a pas, le fallback de preview utilise `fr`.

## Sécurité

- Aucun rôle n'est modifié.
- Aucun profil enfant ou étudiant n'est modifié.
- Les filtres d'affichage changent, pas les permissions Supabase.
- Les réponses aux training items ne sont pas sauvegardées en mode aperçu.
- Les attempts de quiz ne sont pas envoyées en mode aperçu.
