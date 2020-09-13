const sendAnnouncement = require("./sendAnnouncement");
const { MessageEmbed } = require('discord.js');
const embededMsg = require("./emebededMsg");

const SECOND = 1000;
let leftSecond = 2;
let totalSecond = 3;

function startDiscussion(playersChannels, players, guild) {
    setTimeout(() => {
        sendAnnouncement(playersChannels, embededMsg('', `토론 종료까지 ${leftSecond}초 남았습니다.`));
        setTimeout(() => {
            sendAnnouncement(playersChannels, embededMsg('', '토론 종료. 투표를 위해 모두 음소거 처리됩니다. 투표 메세지를 확인하고 투표를 진행해주세요.'));
            //NOTE: mute players
            players.forEach(player => {
                const userId = player.userId;
                const member = guild.members.cache.get(userId);
                member.voice.setMute(true).then().catch(error => {
                    if(error.code === 40032) {
                        console.log(`${member.user.username} is not connected to voice.`);
                    } else {
                        console.log('error', error);
                    }
                });
            });

            //NOTE: send messages about the vote
            isAllVoted = false;
            players.map(player => {
                const playerChannelId = player.channelId;
                const playerChannel = guild.channels.cache.get(playerChannelId);
                //TEMP
                // const playersWithOutMe = _.filter(players, player4Filter => {
                //     return (!player4Filter.isDead && player4Filter.userId !== player.userId);
                // })
                const playersWithOutMe = players;
                player.voteMessages = []; 
                console.log('playersWithOutMe', playersWithOutMe);
                playersWithOutMe.length && playersWithOutMe.forEach(pWOM => {
                    const embededVoteMsg = new MessageEmbed()
                        .setTitle(`vote: ${pWOM.userName}`)
                        .setDescription('이 플레이어를 투표하기 위해서 이 메세지를 우클릭하여 "반응 추가하기"를 해주세요.')
                        .setColor("BLUE");
                    playerChannel.send(embededVoteMsg).then(msg => {
                        player.voteMessages.push({
                            messageId: msg.id,
                            targetUserId: pWOM.userId
                        });
                    });
                });
                // playerChannel.send(`vote: 기권`).then(msg => {
                //     player.voteMessages.push({
                //         messageId: msg.id,
                //         targetUserId: "abstention"
                //     });
                // });
            });
            
        }, leftSecond*SECOND);
    }, (totalSecond-leftSecond)*SECOND);
}

module.exports = startDiscussion;