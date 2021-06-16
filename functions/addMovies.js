const fetch = require("node-fetch");
const url = process.env.ASTRA_GRAPHQL_ENDPOINT;

const shouldAllowNewAddition = async () => {
  const query = `
    query {
      dataset(options:{
        pageSize: 151,
      }){
        values{
          title,
          duration,
          genre
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cassandra-token": process.env.ASTRA_DB_APPLICATION_TOKEN,
    },
    body: JSON.stringify({ query }),
  });

  try {
    const responseBody = await response.json();
    return responseBody.data.dataset.values.length < 100;
  } catch (e) {
    return false;
  }
};

const handler = async function (event) {
  const body = JSON.parse(event.body);

  const allowed = await shouldAllowNewAddition();
  if (!allowed) {
    return {
      statusCode: 400,
      body: "Database is full",
    };
  }

  const query = `
    mutation {
      insertmovies_by_genre( value: {
        genre: "${body.genre}",
        year: ${body.year > 0 ? body.year : new Date().getFullYear()},
        title: "${body.title}",
        duration: ${body.duration > 0 ? body.duration : 0},
      }) {
        value{
          year
          title
        }
      }
    }
  `;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cassandra-token": process.env.ASTRA_DB_APPLICATION_TOKEN,
    },
    body: JSON.stringify({ query }),
  });
  try {
    const responseBody = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify(e),
    };
  }
};

exports.handler = handler;

// try {
//   handler({
//     body: JSON.stringify({
//       genre: "Sci-Fi",
//       year: 2010,
//       title: "Test",
//       synopsis: "Lorem ipsum",
//       duration: 111,
//       thumbnail: "https://github.com",
//     }),
//   });
// } catch (error) {
//   console.log(error);
// }
