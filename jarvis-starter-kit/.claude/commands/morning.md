# /morning

> Commande raccourci pour démarrer votre journée en 30 secondes avec une veille personnalisée.

---

## Mission

Quand je lance `/morning`, exécute la séquence complète suivante en utilisant la skill **recherche-actualites-contextualisees**.

### Étape 1 : Charger mon contexte

Lis silencieusement :
1. `CLAUDE.md`
2. `context/CONTEXT.md`
3. `context/HISTORY.md`

Pas besoin de me résumer le contexte, je le connais. Charge juste pour bien filtrer la veille.

### Étape 2 : Scanner les dossiers Drive des projets actifs

Pour chaque projet actif, vérifier les fichiers modifiés ou créés dans les 7 derniers jours dans les dossiers Drive référencés dans CONTEXT.md.

Dossiers à scanner :
- CHARTER : dossier principal ID `1-T0-_vVMH0LFMk_jGsmfPLT8FDaM2qmM` (scanner tous les sous-dossiers)
- TRADING weekly reports : ID `1OoQKgPHJwyJ9x_PU4H2JU_Y3ZsTfJyoU`
- TRADING trade ideas : ID `1Hr8Y9mRjkz9aZoSVqK5ye0JuOtZZqXC_`
- MATH EDUCATION : dossier principal ID `1DxYYFS_vUnBxq6DvOQacioksAp2Gnh7g` (scanner tous les sous-dossiers)

Règles :
- Si de nouveaux fichiers sont détectés, les lister brièvement dans la section "📁 Drive" du format de sortie
- Si rien de nouveau, ne pas afficher la section Drive (ne pas mentionner l'absence)
- Pour les weekly reports et trade ideas TRADING : signaler spécifiquement si un nouveau rapport ou de nouvelles trade ideas sont disponibles, car c'est un signal d'action
- Lire le contenu des nouveaux fichiers Trade Ideas TRADING pour en extraire un résumé actionnable (buy orders, stop orders)

### Étape 3 : Effectuer la veille du jour

Lance la skill `recherche-actualites-contextualisees` avec ces paramètres par défaut :
- Périmètre : actualités IA + actualités de mon secteur d'activité
- Filtre : selon mon contexte chargé
- Format : présentation matinale claire

### Étape 4 : Ajouter le résumé de mon agenda (si possible)

Si un connecteur calendrier (Google Calendar, etc.) est actif :
- Récupère mes événements de la journée
- Présente-les brièvement après la veille

Si aucun connecteur calendrier actif, ne mentionne rien sur l'agenda.

### Étape 5 : Présenter le tout dans un format unique

Format de sortie attendu :

```
☀️ Bonjour. Voici votre matinée.

📁 Drive (si nouveaux fichiers détectés)
[Liste courte des fichiers nouveaux ou modifiés par projet — si trade ideas TRADING : résumé actionnable des buy/stop orders]

📰 Votre veille du jour
[Résultat de la skill recherche-actualites-contextualisees]

📅 Votre agenda du jour (si connecteur disponible)
[Liste des événements de la journée]

🎯 Votre focus suggéré
[1 phrase qui propose le focus principal de la journée basé sur la veille + agenda + projets en cours]

Bonne journée. Je suis prêt à vous aider.
```

---

## Règles importantes

- L'objectif de cette commande, c'est de remplacer 15 minutes de scroll matinal par 30 secondes de lecture utile
- Ne jamais dépasser 1 page de sortie, sinon c'est trop long pour une routine matinale
- Si quelque chose n'est pas disponible (pas de connecteur calendrier par exemple), ne pas le mentionner, juste passer à la section suivante
- Communication en français
- Pas de tirets longs (em dashes)
