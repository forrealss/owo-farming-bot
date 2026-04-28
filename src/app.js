const { Client } = require("discord.js-selfbot-v13");
const boxen = require("boxen").default;
const { consola } = require("consola");
const figlet = require("figlet");
const gradient = require("gradient-string");
require("dotenv").config();

const discordClient = new Client({
	checkUpdate: false, // Disable update check untuk startup lebih cepat
	ws: {
		properties: {
			browser: "Discord Client"
		}
	}
});

const renderIntro = ({ serverId, channelId }) => {
	const title = figlet.textSync("Discord Farming Bot", {
		horizontalLayout: "full"
	});
	console.log(gradient.mind.multiline(title));

	const startedAt = new Date();
	const info = [
		`Started at : ${startedAt.toLocaleString()}`,
		`Server ID  : ${serverId}`,
		`Channel ID : ${channelId}`
	].join("\n");

	console.log(
		boxen(info, {
			padding: 1,
			margin: 1,
			borderStyle: "round",
			borderColor: "cyan"
		})
	);
};

try {
	const token = process.env.DISCORD_TOKEN;
	const serverId = process.env.SERVER_ID;
	const channelId = process.env.CHANNEL_ID;

	if (!token) {
		throw new Error("DISCORD_TOKEN is not set in the environment");
	}
	if (!serverId) {
		throw new Error("SERVER_ID is not set in the environment");
	}
	if (!channelId) {
		throw new Error("CHANNEL_ID is not set in the environment");
	}

	renderIntro({ serverId, channelId });

	discordClient.once("ready", async () => {
		try {
			consola.success("Discord client ready");
			const guild = await discordClient.guilds.fetch(serverId);
			const channel = await guild.channels.fetch(channelId);
			if (!channel || !channel.isText()) {
				throw new Error("Target channel is not a text channel");
			}

			consola.info({ serverId, channelId }, "Target channel resolved");

				const formatTime = (date) => date.toLocaleString();

			const getRandomDelayMs = () => {
				const minMs = 15000;
				const maxMs = 25000;
				return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
			};

			const loopSend = async () => {
				try {
					await channel.send("owoh");
					consola.info({ at: formatTime(new Date()) }, "Sent message: owoh");
					await new Promise((resolve) => setTimeout(resolve, 2000));
					await channel.send("owob");
					consola.info({ at: formatTime(new Date()) }, "Sent message: owob");
				} catch (sendErr) {
					consola.error(sendErr);
				}

				const nextDelay = getRandomDelayMs();
				const nextSendAt = new Date(Date.now() + nextDelay);
				consola.info(
					{ nextDelayMs: nextDelay, nextSendAt: formatTime(nextSendAt) },
					"Next send scheduled"
				);
				setTimeout(loopSend, nextDelay);
			};

			loopSend();
		} catch (sendErr) {
			consola.error(sendErr);
		}
	});

	discordClient.login(token);
} catch (err) {
	consola.error(err);
}
