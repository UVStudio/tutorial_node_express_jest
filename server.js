const app = require('./src/app');
const sequelize = require('./src/config/database');

sequelize.sync({
  force: true, //in test only, never production
});

app.listen(5000, () => {
  console.log('Server running on 5000');
});

//to start frontend server on port 3000:
//npx http-server -c-1 -p 8080 -P http://localhost:3000
