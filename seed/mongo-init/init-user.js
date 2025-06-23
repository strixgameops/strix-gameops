db = db.getSiblingDB('strix_production');
db.createUser({
  user: 'strix',
  pwd: 'YOUR_MONGO_PASSWORD',
  roles: [{ role: 'readWrite', db: 'strix_production' }]
});