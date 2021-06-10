// Require the framework and instantiate it
const fastify = require("fastify")({ logger: true });

fastify.register(require("fastify-formbody"));

fastify.register(require("./routes"));

// Run the server!
const start = async () => {
  try {
    await fastify.listen(process.env.PORT || 3000, "0.0.0.0");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
