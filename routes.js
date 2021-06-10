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
      let formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      });
      const slackResponse = await axios.post(req.body.response_url, {
        replace_original: "true",
        channel: req.body.channel_id,
        response_type: "in_channel",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `The price of *${response.data.name}* is ${formatter.format(
                response.data.market_data.current_price.usd
              )}.\n\n${response.data.description.en}

              `,
            },
            accessory: {
              type: "image",
              image_url: `${response.data.image.thumb}`,
              alt_text: `${response.data.name} icon`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Volume(24h):*\n${formatter.format(
                  response.data.market_data.total_volume.usd
                )}`,
              },
              {
                type: "mrkdwn",
                text: `*% change(24h):*\n${response.data.market_data.price_change_percentage_24h}%`,
              },
            ],
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Market Cap:*\n${formatter.format(
                  response.data.market_data.market_cap.usd
                )}`,
              },
              {
                type: "mrkdwn",
                text: `*Market Cap Rank:*\n#${response.data.market_data.market_cap_rank}`,
              },
            ],
          },
        ],
      });
      reply.send();
    } catch (error) {
      console.log(error.response.body);
    }
  });
}

module.exports = routes;
