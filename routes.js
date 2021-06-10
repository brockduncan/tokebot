const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { WebClient } = require("@slack/web-api");

const token = process.env.SLACK_TOKEN;
const web = new WebClient(token);

async function routes(fastify, options) {
  fastify.get("/", async (request, reply) => {
    return { hello: "toker" };
  });

  // update token list
  fastify.get("/tokens/update", async (request, reply) => {
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
  fastify.get("/quote/:symbol", async (request, reply) => {
    try {
      const tokens = await JSON.parse(
        fs.readFileSync(path.join(__dirname, "/data/tokens.json"))
      );
      // lookup token id by symbol
      let tokenID;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].symbol == request.params.symbol) {
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
      reply.send(quoteObj);
    } catch (error) {
      console.log(error.response.body);
    }
  });
}

module.exports = routes;
