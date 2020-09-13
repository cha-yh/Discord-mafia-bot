const { MessageEmbed } = require('discord.js');
const embededMsg = require('./emebededMsg');

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
            channel.send(embededMsg('모두 "토론 음성 채널"에 입장해주세요.', '', "ORANGE"));
            channel.send(embededMsg('', '이 채널은 당신에게만 보이는 채널입니다. 이곳에서 메세지 우클릭>"반응 추가하기"를 투표, 죽일 시민 선택(마피아일 경우) 등을 할 수 있습니다.'));
            
            // const embededMafiaMsg = new MessageEmbed()
            //     .setTitle('당신은 마피아입니다.')
            //     .setColor('RED');
            userId === mafiaId && channel.send(embededMsg(
                '당신은 마피아입니다.', '', 'RED'
            ));

            // const embededReadyMsg = new MessageEmbed()
            //     .setTitle('[Ready] 준비가 완료되었습니까?')
            //     .setColor('GREEN')
            //     .setDescription('준비되었다면 이 메세지를 우클릭하여 "반응 추가하기"를 하여 준비를 완료하세요.');
            channel.send(embededMsg(
                '[Ready] 준비가 완료되었습니까?',
                '준비되었다면 이 메세지를 우클릭하여 "반응 추가하기"를 하여 준비를 완료하세요.',
                'GREEN'
            )).then(msg => {
                players.find(item => item.userId === userId).readyMsgId = msg.id;
            })
        })
    }
}

module.exports = createChannels;