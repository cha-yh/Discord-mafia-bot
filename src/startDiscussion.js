const sendAnnouncement = require("./sendAnnouncement");

const SECOND = 1000;
let leftSecond = 10;
let totalSecond = 60;

function startDiscussion(playersChannels, players, guild) {
    setTimeout(() => {
        sendAnnouncement(playersChannels, `토론 종료까지 ${leftSecond}초 남았습니다.`);
        setTimeout(() => {
            sendAnnouncement(playersChannels, '토론 종료. 투표를 위해 모두 음소거 처리됩니다. 각자의 채널에서 투표 메세지를 확인하고 투표를 진행해주세요.');
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
                    playerChannel.send(`vote: ${pWOM.userName}`).then(msg => {
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