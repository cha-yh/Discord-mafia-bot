const { MessageEmbed } = require("discord.js");


function embededMsg(title, body, color) {
    return new MessageEmbed()
        .setTitle(title)
        .setDescription(body)
        .setColor(color);
}

module.exports = embededMsg;