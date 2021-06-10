const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function routes(fastify, options) {
  fastify.get("/", async (req, reply) => {
    return { hello: "toker" };
  });

  // update token list
  fastify.get("/tokens/update", async (req, reply) => {
    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/coins/list?include_platform=false"
      );
      let dir = "./data";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      fs.writeFile(
        path.join(__dirname, "data", "tokens.json"),
        JSON.stringify(response.data),
        (error) => {
          if (error) return console.log(error);
        }
      );
      reply.send("tokens updated!");
    } catch (error) {
      console.log(error.response.body);
    }
  });

  // get token price
  fastify.post("/quote", async (req, reply) => {
    try {
      const tokens = await JSON.parse(
        fs.readFileSync(path.join(__dirname, "/data/tokens.json"))
      );
      // lookup token id by symbol
      let tokenID;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].symbol == req.body.text) {
          tokenID = await tokens[i].id;
        }
      }
      // get quote by id
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${tokenID}`
      );
      const quoteObj = {
        name: response.data.name,
        price: response.data.market_data.current_price.usd,
      };
      const slackResponse = await axios.post(req.body.response_url, {
        text: `The price of ${response.data.name} is $${response.data.market_data.current_price.usd} 💰`,
        response_type: "ephemeral",
      });
    } catch (error) {
      console.log(error.response.body);
    }
  });
}

module.exports = routes;
