require('dotenv').config();
const Discord = require('discord.js');
const _ = require('lodash');
const sendAnnouncement = require('./sendAnnouncement');
const startDiscussion = require('./startDiscussion');
const createChannels = require('./createChannels');
const setMute = require('./setMute');

const client = new Discord.Client();

const PREFIX = "$";
const MINUTE = 60*1000;

let isCreated = false;
let joinedUserIds = [];
let createdChannelIds = [];
let voiceChannelId = undefined;
let createdRoleIds = [];
let mafiaId;
let players = [];
let isAllReady = false;
let isAllVoted = false;
let voteRound = 0;
let deadPlayerIds = [];
let mafiaKillingMsgObjectArray = [];
let voteCount = 0;
let isGameStarted = false;

async function finishGame(guild) {
    //NOTE: delete created roles
    createdRoleIds.forEach(id => {
        guild.roles.cache.get(id).delete();
    })
    
    //NOTE: delete created channels
    const deleteChannels = () => new Promise(async (resolve, reject) => {
        for(const id of createdChannelIds) {
            await guild.channels.cache.get(id).delete()
        }
        createdChannelIds = [];
        resolve();
    })
    
    try {
        await setMute(guild, joinedUserIds, false)
        await deleteChannels();
    } catch (error) {
        console.log('$end: error', error);
    }
    
    //NOTE : initiate vars
    voiceChannelId = undefined;
    players = [];
    joinedUserIds = [];
    isCreated = false;
    isGameStarted = false;
}

client.on('ready', () => {
    console.log(`${client.user.tag} has logged in.`);
})
client.on('message', async msg => {
    if(msg.author.bot) return;
    if(msg.content.startsWith(PREFIX)) {
        const [CMD_NAME, ...args] = msg.content
            .trim()
            .substring(PREFIX.length)
            .split(/\s+/);

        console.log('CMD_NAME', CMD_NAME);
        console.log('args', args);

        if(CMD_NAME === 'create') {
            //NOTE : check validation
            if(args[0].match(/[^0-9]/g)) {
                msg.channel.send('잘못된 입력입니다. "$create 3" 과 같이 명령어 뒤에 숫자를 입력해주세요.');
                return;
            }
            if(args[0]<4) {
                msg.channel.send('너무 작은 수를 입력하였습니다. 게임 시작의 최소인원은 4명입니다. 명령어 뒤에 숫자를 4이상으로 입력해주세요.');
                return;
            }
            if(args[0]>10) {
                msg.channel.send('너무 많은 수를 입력하였습니다. 게임 시작의 최대인원은 10명입니다. 명령어 뒤에 숫자를 10이하로 입력해주세요.');
                return;
            }
            
            //NOTE : let createFlag be true
            isCreated = true;
        }

        if(CMD_NAME === 'join') {
            const authorId = msg.author.id;
            const index = joinedUserIds.findIndex(userId => userId === authorId);
            const member = msg.guild.members.cache.get(authorId);
            if(index === -1) {
                joinedUserIds.push(authorId);
                msg.channel.send(`${member.user.username}님이 참여하였습니다.`);
            } else {
                msg.channel.send(`${member.user.username}님은 이미 참여한 상태입니다.`);
            }
        }

        if(CMD_NAME === 'status') {
            const joinedUserCount = joinedUserIds.length;
        
            msg.channel.send(`Joined user count: ${joinedUserCount}`);
            let joinedUserNames = [];
            joinedUserIds.length
                ? 
                joinedUserIds.forEach(userId => {
                    const member = msg.guild.members.cache.get(userId);
                    joinedUserNames.push(member.user.username);
                })
                
                : msg.channel.send('아무도 참여하지 않은 상태입니다.');
        
            joinedUserNames.length && msg.channel.send(`참여한 멤버: ${joinedUserNames.join(', ')}`);
        }

        if(CMD_NAME === 'start') {
            if(joinedUserIds.length === 0) {
                msg.channel.send('참가한 인원없이 게임을 시작할 수 없습니다.');
                return;
            }
            isGameStarted = true;
            //NOTE: init players
            players = joinedUserIds.map(userId => {
                return {
                    userId,
                    userName: msg.guild.members.cache.get(userId).user.username,
                    isReady: false,
                    isDead: false,
                    channelId: undefined,
                    readyMsgId: undefined,
                    voteMessages: [],
                    voteUserIds: [],
                    isVoteCompletedArray: [],

                }
            })
            //NOTE: random mafia
            const randomIndex = Math.floor(Math.random() * joinedUserIds.length);
            mafiaId = joinedUserIds[randomIndex];
            const mafia = msg.guild.members.cache.get(mafiaId);
            console.log('mafia name: ', mafia.user.username);

            //NOTE: create channels
            createChannels(msg.guild, joinedUserIds, players, mafiaId, createdChannelIds);

            //NOTE: Create a voice type channel
            msg.guild.channels.create('토론 음성 채널', {
                type: "voice",
                permissionOverwrites: msg.guild.members.cache.map(member => {
                    const isMemberJoined = _.some(joinedUserIds, id => id === member.id);
                    if(!isMemberJoined) {
                        return {
                            id: member.id,
                            deny: ["VIEW_CHANNEL"]
                        }
                    }
                    return {
                        id: member.id,
                        deny: ["SEND_MESSAGES"]
                    }
                })
            }).then(channel => {
                createdChannelIds.push(channel.id);
                voiceChannelId = channel.id;
            })

            
            

            //NOTE : make roles
            //FIXME : fix position issue
            // msg.guild.roles.create({
            //     data: {
            //         name: '송장',
            //         position: joinedUserIds.length+1,
            //         color: 'DARK_GREY',
            //         permissions: []
            //     }
            // }).then(role => {
            //     createdRoleIds.push(role.id);
            // })
            
            // joinedUserIds.forEach(userId => {
            //     msg.guild.roles.create({
            //         data: {
            //             name: `role[${userId}]`,
            //             position: userId === mafiaId ? joinedUserIds.length : 1,
            //             color: 'GOLD',
            //             permissions: userId === mafiaId ? ['MANAGE_ROLES'] : []
            //         }
            //     }).then(role => {
            //         createdRoleIds.push(role.id);
            //         const member = msg.guild.members.cache.get(userId);
            //         member.roles.add(role.id);
            //     });
            // })
        }
        
        if(CMD_NAME === 'test') {
            console.log('isCreated', isCreated);
            console.log('joinedUserIds', joinedUserIds);
            console.log('createdChannelIds', createdChannelIds);
            console.log('voiceChannelId', voiceChannelId);
            console.log('createdRoleIds', createdRoleIds);
            console.log('mafiaId', mafiaId);
            console.log('players', players);
            console.log('isAllReady', isAllReady);
            console.log('isAllVoted', isAllVoted);
            console.log('voteRound', voteRound);
            console.log('deadPlayerIds', deadPlayerIds);
            console.log('mafiaKillingMsgObjectArray', mafiaKillingMsgObjectArray);
            console.log('voteCount', voteCount);
            console.log('isGameStarted', isGameStarted);
        }
        if(CMD_NAME === 'delete:channels' || CMD_NAME==='dcs') {
            console.log('channels: ', msg.guild.channels);
            msg.guild.channels.cache.map(channel => {
                if(channel.name === 'chaccy' ||
                    channel.name === 'chayh' ||
                    channel.name === '전체-진행-채널' ||
                    channel.name === '토론 음성 채널'
                ) {
                    channel.delete();
                }
            })
        }

        if(CMD_NAME === 'end') {
            await finishGame(msg.guild);
        }

        if(CMD_NAME === 'quit') {
            const filtered = joinedUserIds.filter(id => id !== msg.author.id);
            joinedUserIds = filtered;
            msg.channel.send(`${msg.author.username}님이 게임에서 나가셨습니다.`);

            //TODO: unMute(when joined member is quit)
        }

        if(CMD_NAME === 'unmute') {
            if(msg.author.id === '370497277438984203') {
                msg.guild.members.cache.get(msg.author.id).voice.setMute(false);
            } else {
                
                if(_.some(joinedUserIds, id => id === msg.author.id)) {
                    msg.guild.members.cache.get(msg.author.id).voice.setMute(false);
                } else {
                    msg.reply('게임에서 음소거된 유저가 아닙니다. 관리자에게 문의하세요.');
                }
            }
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    //TODO: 플레이어의 리액션만 수렴하도록 하기

    const msgId = reaction.message.id;
    const userId = user.id;
    const player = players.find(player => player.userId === userId);
    const mafiaPlayer = players.find(p => p.userId === mafiaId);
    const mafiaChannelId = mafiaPlayer?mafiaPlayer.channelId:"";
    const mafiaChannel = reaction.message.guild.channels.cache.get(mafiaChannelId);
    const reactionFrom = reaction.message.channel;
    const playersChannels = reaction.message.guild.channels.cache.filter(channel => {
        return _.some(players, p => p.channelId === channel.id)
    })

    //SECTION: for ready
    if(player.readyMsgId === msgId) {
        // const userChannelId = players.find(player => player.userId === userId).channelId;
        if(reaction.message.guild.members.cache.get(user.id).voice.channelID === voiceChannelId) {
            players.find(player => player.userId === userId).isReady = true;
            reaction.message.delete();
            reactionFrom.send('게임 Ready 완료.');
        } else {
            reaction.remove();
            reactionFrom.send('"토론 음성 채널" voice 채널에 입장 해주세요.').then(msg => {
                msg.delete({timeout: 2000})
            });
        }

        isAllReady = !_.some(players, item => item.isReady === false );

        if(isAllReady) {
            sendAnnouncement(playersChannels, 'All users ready')
            sendAnnouncement(playersChannels, '모든 유저가 준비 완료되었습니다. 이제 3분 동안 토론을 진행할 수 있습니다. 3분이 지나면 자동 음소거 처리됩니다. 토론 후에는 투표를 진행하며, 지목된 사람은 최후의 변론을 위해 30초간 음소거가 해제됩니다. 그 후 찬반투표를 통해 최종결정을 하게됩니다.')
            startDiscussion(playersChannels, players, reaction.message.guild);
        }
    }

    //SECTION: vote someone through reaction
    if(_.some(player.voteMessages, vMsg => vMsg.messageId === reaction.message.id)) {
        //NOTE: insert votedUserId
        const votedUserId = player.voteMessages.find(msg => msg.messageId === reaction.message.id).targetUserId;
        player.voteUserIds.push(votedUserId);

        //NOTE: delete voteMessages
        player.voteMessages.forEach(msg => {
            reaction.message.channel.messages.cache.get(msg.messageId).delete();
        });
        //NOTE: sending a message abount finishing vote
        reaction.message.channel.send('투표 완료.');

        //NOTE: initiate voteMessages / voteCompleted
        player.voteMessages = [];
        player.isVoteCompletedArray.push(true);
        console.log('player.isVoteCompletedArray', player.isVoteCompletedArray);

        //NOTE: change isAllVoted flag 
        voteCount += 1;
        isAllVoted = players.length === voteCount;
        // isAllVoted = !_.some(players, p => (p.isVoteCompletedArray[voteRound] === false || p.isVoteCompletedArray[voteRound] === undefined) );
        console.log('isAllVoted', isAllVoted);
        //NOTE: finish voting / round + 1
        //TODO: finish inside todos
        if(isAllVoted) {
            voteCount = 0;
            sendAnnouncement(playersChannels, '모든 유저 투표 완료.');
            const voteResult = players.map(p => {
                const userName = p.userName;
                const votedUserId = p.voteUserIds[voteRound];
                let votedUserName = "";
                const votedPlayer = players.find(item => item.userId === votedUserId);
                if(votedUserId === "abstention") {
                    votedUserName = "abstention";
                } else {
                    console.log('votedPlayer', votedPlayer);
                    votedUserName = votedPlayer ? votedPlayer.userName : "알수없는 에러";
                }

                return {
                    voterUserId: p.userId,
                    voterName: userName,
                    votedUserName,
                    votedUserId: votedPlayer.userId
                }

            });
            let resultText = `[${voteRound+1} Round]`;
            voteResult.forEach(vr => {
                resultText = resultText + '\n' +`${vr.voterName}가 ${vr.votedUserName}를 투표하였습니다.`
            })
            sendAnnouncement(playersChannels, resultText);

            const countedVoteResult = _.countBy(voteResult, vr => `${vr.votedUserId}/${vr.votedUserName}`);
            //TODO: 투표수 과반시 players에서 삭제하고 투표로 처형했다는 메세지 보내기
            //TODO: 만약 마피아 처형시 게임 종료. 메세지 발송 후 종료.
            //TODO: 만약 abstention 과반 시 아무일도 없다는 메세지.
            //TODO: 마피아의 밤이 찾아오는 로직 구현하기
            //TODO: 마피아가 밤에 죽인 사람은 음소거가 되고 시체들이 대화할 수 있는 채널에서 채팅이가능하다.

            console.log('countedVoteResult', countedVoteResult);
            const mappedArray = [];
            Object.keys(countedVoteResult).forEach(key => {
                mappedArray.push({
                    userId: key.split('/')[0],
                    name: key.split('/')[1],
                    voteCount: countedVoteResult[key]
                })
            })
            console.log('mappedArray', mappedArray);
            const sortedArray = mappedArray.sort((a,b) => {
                return a.voteCount > b.voteCount ? -1 : a.voteCount < b.voteCount ? 1 : 0;
            })
            console.log('sortedArray', sortedArray);
            if(sortedArray.length === 1) {
                sendAnnouncement(playersChannels, `최다득표수(${sortedArray[0].voteCount})를 얻은 ${sortedArray[0].name}은 투표로 인해 처형되었습니다.`);
                players = _.filter(players, p => p.userId !== sortedArray[0].userId);
                deadPlayerIds.push(sortedArray[0].userId);
            } else if(sortedArray.length > 1) {
                if(sortedArray[0].voteCount > sortedArray[1].voteCount) {
                    sendAnnouncement(playersChannels, `최다득표수(${sortedArray[0].voteCount})를 얻은 ${sortedArray[0].name}은 투표로 인해 처형되었습니다.`);
                    players = _.filter(players, p => p.userId !== sortedArray[0].userId);
                    deadPlayerIds.push(sortedArray[0].userId);
                } else {
                    sendAnnouncement(playersChannels, `최다득표자들의 투표수가 같아 아무도 처형되지 않았습니다.`);
                }
            }
            if(!_.some(players, p => p.userId === mafiaId)) {
                sendAnnouncement(playersChannels, '마피아가 처형되었습니다. 시민팀이 승리하였습니다.');
                await setMute(reaction.message.guild, joinedUserIds, false);
            } else {
                sendAnnouncement(playersChannels, '밤이 되었습니다.');
                voteRound += 1;
                
                mafiaChannel.send('제거할 대상에 "반응추가하기"를 눌러 지목해주세요.');
                const playersWithOutMafia = _.filter(players, p => {
                    return (p.userId !== mafiaId);
                })
                playersWithOutMafia.forEach(pWOM => {
                    mafiaChannel.send(`kill: ${pWOM.userName} 제거하기`).then(msg => {
                        mafiaKillingMsgObjectArray.push({
                            messageId: msg.id,
                            targetUserId: pWOM.userId,
                            targetUserName: pWOM.userName
                        });
                    })
                })
            }
        }
    }

    //SECTION: kill someone through reaction
    if(_.some(mafiaKillingMsgObjectArray, mkmo => mkmo.messageId === reaction.message.id)) {
        const target = {...mafiaKillingMsgObjectArray.find(mkmo => mkmo.messageId === reaction.message.id)};
        const playerIds = players.map(p => p.userId);
        
        //NOTE: initiate mafiaKillingMsgObjectArray and delete killing msgs
        mafiaKillingMsgObjectArray.forEach(mkmo => {
            reaction.message.channel.messages.cache.get(mkmo.messageId).delete();
        })
        mafiaKillingMsgObjectArray = [];


        mafiaChannel.send(`당신은 ${target.targetUserName}을 제거하였습니다.`);
        players = _.filter(players, p => p.userId !== target.targetUserId);

        sendAnnouncement(playersChannels, `낮이 되었습니다.`);
        sendAnnouncement(playersChannels, `${target.targetUserName}은(는) 마피아에게 ${reaction.emoji}로 살해당하였습니다.`);
        
        if(_.some(players, p => p.userId === mafiaId) && players.length < 3) { //NOTE: 마피아 승리 게임 종료 조건
            //NOTE: finish the game
            sendAnnouncement(playersChannels, `마피아가 승리하였습니다.`);
            await setMute(reaction.message.guild, joinedUserIds, false);
            return;
        }

        //NOTE: Unmute left players
        await setMute(reaction.message.guild, playerIds, false);
        sendAnnouncement(playersChannels, `음소거가 해제 되었습니다. 3분간 토론을 진행해주세요.`);

        startDiscussion(playersChannels, players, reaction.message.guild);
        

        
    }

})

client.login(process.env.DISCORDJS_BOT_TOKEN);