const boxen = require("boxen").default;
const { consola } = require("consola");
const figlet = require("figlet");
const gradient = require("gradient-string");

/**
 * Tampilkan banner ASCII art + info server di terminal.
 */
function renderIntro({ serverId, channelId }) {
  const title = figlet.textSync("OwoBot", { horizontalLayout: "full" });
  console.log(gradient.mind.multiline(title));

  const info = [
    `Started at : ${new Date().toLocaleString()}`,
    `Server ID  : ${serverId}`,
    `Channel ID : ${channelId}`,
  ].join("\n");

  console.log(
    boxen(info, {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
    }),
  );
}

module.exports = { consola, renderIntro };
