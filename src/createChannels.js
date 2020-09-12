function createChannels(guild, joinedUserIds, players, mafiaId, createdChannelIds) {
    for(const userId of joinedUserIds) {
        const member = guild.members.cache.get(userId);
        guild.channels.create(`${member.user.username}`, {
            permissionOverwrites: guild.members.cache.map(member => {
                if(member.id === userId) {
                    return {
                        id: userId,
                        deny: ["SEND_MESSAGES"]
                    }
                }
                return {
                    id: member.id,
                    deny: ["VIEW_CHANNEL"]
                }
            }),

        }).then(async channel => {
            createdChannelIds.push(channel.id);

            players.find(item => item.userId === userId).channelId = channel.id;
            console.log('mafiaId', mafiaId)
            channel.send('모두 "토론 음성 채널"에 입장해주세요.');
            channel.send('이 채널은 당신에게만 보이는 채널입니다. 이곳은 오직 진행해야 하는 상황 메세지를 읽고, 우클릭>"반응추가"를 투표, 투표 가결 처리 등을 할 수 있습니다.');
            userId === mafiaId && channel.send('당신은 마피아입니다.');
            channel.send('[Ready] 준비가 완료되었습니까? 되었다면 이 메세지를 우클릭하여 "반응 추가하기"를 하여 준비를 완료하세요.').then(msg => {
                players.find(item => item.userId === userId).readyMsgId = msg.id;
            })
        })
    }
}

module.exports = createChannels;