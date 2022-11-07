const app = require('./src/app');
const sequelize = require('./src/config/database');

sequelize.sync({
  force: true, //in test only, never production
});

app.listen(3000, () => {
  console.log('Server running on 3000');
});

//to start frontend server on port 8080:
//npx http-server -c-1 -p 8080 -P http://localhost:3000
//access the client from browser: localhost:8080
