require('dotenv').config();

const Discord = require('discord.js');

const client = new Discord.Client();

const PREFIX = "$";

client.on('ready', () => {
    console.log(`${client.user.tag} has logged in.`);
})
client.on('message', msg => {
    if(msg.author.bot) return;
    if(msg.content.startsWith(PREFIX)) {
        const [CMD_NAME, ...args] = msg.content
            .trim()
            .substring(PREFIX.length)
            .split(/\s+/);

        console.log('CMD_NAME', CMD_NAME);
        console.log('args', args);
    }
  });

client.login(process.env.DISCORDJS_BOT_TOKEN);