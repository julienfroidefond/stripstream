// MongoDB initialization script
db = db.getSiblingDB('stripstream');

// Create a user for the stripstream database
db.createUser({
  user: 'admin',
  pwd: 'password123',
  roles: [
    {
      role: 'readWrite',
      db: 'stripstream'
    }
  ]
});

// Create initial collections
db.createCollection('users');
db.createCollection('configs');
db.createCollection('preferences');
db.createCollection('favorites');
db.createCollection('bookProgress');

print('MongoDB initialization completed successfully');
