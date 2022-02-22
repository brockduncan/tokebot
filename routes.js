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

  // get eth gas price
  fastify.post("/gas", async (req, reply) => {
    try {
      const response = await axios.get(
        `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`
      );
      console.log(response.data.result);
      const slackResponse = await axios.post(req.body.response_url, {
        replace_original: "false",
        channel: req.body.channel_id,
        response_type: "in_channel",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `ETH :fuelpump: :gq:\n:turtle: Slow *${response.data.result.SafeGasPrice}* gwei\n:pig2: Average *${response.data.result.ProposeGasPrice}* gwei\n:rabbit2: Fast *${response.data.result.FastGasPrice}* gwei`,
            },
          },
        ],
      });
      reply.send();
    } catch (error) {
      console.error(error.message);
    }
  });

  // get token price
  fastify.post("/quote", async (req, reply) => {
    console.log(req.body.text);
    try {
      const tokens = await JSON.parse(
        fs.readFileSync(path.join(__dirname, "/data/tokens.json"))
      );
      // lookup token id by symbol
      let tokenID;
      for (let i = 0; i < tokens.length; i++) {
        if (
          tokens[i].symbol == req.body.text &&
          !tokens[i].id.includes("-wormhole")
        ) {
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
      let price = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 3,
      });
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
              text: `The price of *${response.data.name}* is ${price.format(
                response.data.market_data.current_price.usd
              )}\n👉 <${
                response.data.links.homepage[0]
              }|Website>\n👉 <https://twitter.com/${
                response.data.links.twitter_screen_name
              }|Twitter>\n👉 <${response.data.links.subreddit_url}|Reddit>`,
            },
            accessory: {
              type: "image",
              image_url: `${response.data.image.large}`,
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
                text: `*% Change(24h):*\n${response.data.market_data.price_change_percentage_24h}%`,
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
      console.log(req.body.text);
      reply.send();
    } catch (error) {
      console.log(error.response.body);
    }
  });

  // random gif
  // get eth gas price
  fastify.post("/random-gif", async (req, reply) => {
    try {
      const response = await axios.get(
        `https://g.tenor.com/v1/random?key=${process.env.TENOR_API_KEY}&q=${req.body.text}&media_filter=minimal`
      );
      console.log(response.data.results[0].media.tinygif.url);
      const slackResponse = await axios.post(req.body.response_url, {
        replace_original: "false",
        channel: req.body.channel_id,
        response_type: "in_channel",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${req.body.text}* ${response.data.results[0].media.tinygif.url}`,
            },
          },
        ],
      });
      reply.send();
    } catch (error) {
      console.error(error.message);
    }
  });
}

module.exports = routes;
