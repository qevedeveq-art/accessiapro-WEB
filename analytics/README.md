# Mesure first-party — inactive par défaut

Cette implémentation est préparée mais non activée. Le site généré ne charge pas
`assets/js/first-party-events.js` et ne possède pas d’endpoint `event.php`.

## Garde-fous

- aucun cookie, stockage local ou identifiant stable ;
- aucune adresse IP, adresse email, nom, société, téléphone ou message ;
- aucune requête de recherche brute ;
- aucune valeur exacte du calculateur ou de l’autodiagnostic ;
- compteur agrégé par jour, événement, page et tranche ;
- répertoire d’agrégats obligatoirement situé hors du webroot ;
- mesure sans effet sur le fonctionnement du site en cas d’échec.

## Activation future

L’activation exige, dans cet ordre :

1. une politique de confidentialité validée et visible ;
2. une décision documentée sur la finalité et la durée de conservation ;
3. une configuration de logs serveur minimisée pour l’endpoint ;
4. la revue de `schema.json` et du fichier PHP d’exemple ;
5. le déploiement explicite de l’endpoint ;
6. le chargement du script et l’attribut `data-measurement="enabled"`.

Les agrégats de performance ne devraient pas dépasser treize mois. Les erreurs
techniques anonymisées, si elles sont ajoutées plus tard, ne devraient pas
dépasser trente jours sans justification spécifique.
