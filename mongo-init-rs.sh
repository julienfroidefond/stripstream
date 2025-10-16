#!/bin/bash
# Script d'initialisation du replica set MongoDB

echo "Attente du démarrage de MongoDB..."
sleep 10

echo "Initialisation du replica set..."
mongosh --host mongodb:27017 -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "
try {
  var status = rs.status();
  print('Replica set déjà initialisé');
} catch (err) {
  if (err.codeName === 'NotYetInitialized') {
    rs.initiate({
      _id: 'rs0',
      members: [{ _id: 0, host: 'mongodb:27017' }]
    });
    print('Replica set initialisé avec succès');
  } else {
    print('Erreur: ' + err);
  }
}
"

echo "Vérification du statut du replica set..."
mongosh --host mongodb:27017 -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "rs.status()"

