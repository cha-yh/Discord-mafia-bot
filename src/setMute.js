async function setMute(guild, ids, muteBoolean) {
    await new Promise(async(resolve, reject) => {
        for(const id of ids) {
            const memberVoice = guild.members.cache.get(id).voice;
            console.log('memberVoice', memberVoice);
            if(memberVoice.channelID) {
                console.log('id', id)
                await memberVoice.setMute(muteBoolean);
            }
        }
        resolve();
    })
}

module.exports = setMute;