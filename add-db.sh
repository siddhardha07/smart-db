curl -X POST http://localhost:3001/api/databases \
  -H "Content-Type: application/json" \
  -d '{
    "id": "mysql-db",
    "name": "MySQL Database",
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "database": "testdb",
    "username": "root",
    "password": "root"
  }'

curl -X POST http://localhost:3001/api/databases \
  -H "Content-Type: application/json" \
  -d '{
    "id": "pg-remote",
    "name": "PostgreSQL Remote",
    "type": "postgresql",
    "host": "localhost",
    "port": 5433,
    "database": "myapp",
    "username": "postgres",
    "password": "password"
  }'
