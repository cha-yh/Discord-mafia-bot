require('dotenv').config();
const Discord = require('discord.js');
const _ = require('lodash');
const client = new Discord.Client();

const PREFIX = "$";
const MINUTE = 60*1000;

let isCreated = false;
let joinedUserIds = [];
let createdChannelIds = [];
let processChannelId = undefined;
let voiceChannelId = undefined;
let createdRoleIds = [];
let mafiaId;
let players = [];
let isAllReady = false;
let isAllVoted = false;
let voteRound = 0;

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

            //NOTE: create channels
            joinedUserIds.forEach(userId => {
                const member = msg.guild.members.cache.get(userId);
                msg.guild.channels.create(`${member.user.username}`, {
                    permissionOverwrites: msg.guild.members.cache.map(member => {
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

                }).then(channel => {
                    createdChannelIds.push(channel.id);
                    players.find(item => item.userId === userId).channelId = channel.id;
                    channel.send('이 채널은 당신에게만 보이는 채널입니다. 이곳은 오직 진행해야 하는 상황 메세지를 읽고, "반응추가"를 투표, 투표 가결 처리 등을 할 수 있습니다.');
                    userId === mafiaId && channel.send('당신은 마피아입니다. 밤이되면 죽이고 싶은 사람을 "반응 추가하기"를 통해 선택하세요.');
                    channel.send('[Ready] 준비가 완료되었습니까? 되었다면 이 메세지에 "반응 추가하기"를 하여 준비를 완료하세요.').then(msg => {
                        players.find(item => item.userId === userId).readyMsgId = msg.id;
                    })
                })
            })
            //NOTE: Create a channel for showing result
            msg.guild.channels.create('전체 진행 채널', {
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
                processChannelId = channel.id;
                channel.send('이 채널은 전체 채널이며, 전체적인 게임 진행상황을 알려줍니다. ');
                channel.send('게임 시작을 위해 각자의 채널에 접속하여 "Ready"라는 문구에 "반응추가하기"를 통해 아무 반응을 하면 준비상태가 됩니다.');
                channel.send('모두 "토론 음성 채널"에 입장해주세요.');
            })
            //NOTE: Create a voice type channel
            msg.guild.channels.create('토론 음성 채널', {
                type: "voice",
                permissionOverwrites: msg.guild.members.cache.map(member => {
                    const isMemberJoined = _.some(joinedUserIds, id => id === member.id);
                    if(!isMemberJoined) {
                        console.log('member', member.user);
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

            //NOTE: random mafia
            const randomIndex = Math.floor(Math.random() * joinedUserIds.length);
            mafiaId = joinedUserIds[randomIndex];
            const mafia = msg.guild.members.cache.get(mafiaId);
            console.log('mafia name: ', mafia.user.username);
            

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
            console.log('player', players);
            console.log('isAllReady', isAllReady);
        }

        if(CMD_NAME === 'end') {
            //NOTE : initiate vars
            joinedUserIds = [];
            isCreated = false;

            //NOTE: delete created channels
            createdChannelIds.forEach(id => {
                msg.guild.channels.cache.get(id).delete();
            })
            processChannelId = undefined;
            voiceChannelId = undefined;

            
            //NOTE: delete created roles
            createdRoleIds.forEach(id => {
                msg.guild.roles.cache.get(id).delete();
            })
            
            //TODO: unMute(when created game is end)
        }

        if(CMD_NAME === 'quit') {
            const filtered = joinedUserIds.filter(id => id !== msg.author.id);
            joinedUserIds = filtered;
            msg.channel.send(`${msg.author.username}님이 게임에서 나가셨습니다.`);

            //TODO: unMute(when joined member is quit)
        }
    }
});

client.on('messageReactionAdd', (reaction, user) => {
    const msgId = reaction.message.id;
    const userId = user.id;
    const player = players.find(player => player.userId === userId);
    const processChannel = reaction.message.guild.channels.cache.get(processChannelId)
    //NOTE: for ready
    if(player.readyMsgId === msgId) {
        players.find(player => player.userId === userId).isReady = true;
        const userChannelId = players.find(player => player.userId === userId).channelId;
        reaction.message.delete();
        reaction.message.guild.channels.cache.get(userChannelId).send('게임 Ready 완료.')

        isAllReady = !_.some(players, item => item.isReady === false );

        if(isAllReady) {
            
            processChannel.send('All users ready');
            processChannel.send('모든 유저가 준비 완료되었습니다. 이제 3분 동안 토론을 진행할 수 있습니다. 3분이 지나면 자동 음소거 처리됩니다. 토론 후에는 투표를 진행하며, 지목된 사람은 최후의 변론을 위해 30초간 음소거가 해제됩니다. 그 후 찬반투표를 통해 최종결정을 하게됩니다.');
            setTimeout(() => {
                processChannel.send('토론 종료까지 3초 남았습니다.');
                setTimeout(() => {
                    processChannel.send('토론 종료. 투표를 위해 모두 음소거 처리됩니다. 각자의 채널에서 투표 메세지를 확인하고 투표를 진행해주세요.');
                    //NOTE: mute players
                    players.forEach(player => {
                        const userId = player.userId;
                        const member = reaction.message.guild.members.cache.get(userId);
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
                        const playerChannel = reaction.message.guild.channels.cache.get(playerChannelId);
                        const playersWithOutMe = _.filter(players, player4Filter => {
                            return (!player4Filter.isDead && player4Filter.userId !== player.userId);
                        })
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
                        playerChannel.send(`vote: 기권`).then(msg => {
                            player.voteMessages.push({
                                messageId: msg.id,
                                targetUserId: "abstention"
                            });
                        });
                    });
                    
                }, 3000);
            }, 1000);
        }
    }

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

        //NOTE: change isAllVoted flag 
        isAllVoted = !_.some(players, p => (p.isVoteCompletedArray[voteRound] === false || p.isVoteCompletedArray[voteRound] === undefined) );
        
        //NOTE: finish voting / round + 1
        //TODO: finish inside todos
        if(isAllVoted) {
            processChannel.send('모든 유저 투표 완료.');
            const voteResult = players.map(p => {
                const userName = p.userName;
                const votedUserId = p.voteUserIds[voteRound];
                let votedUserName = "";
                if(votedUserId === "abstention") {
                    votedUserName = "abstention";
                } else {
                    const votedPlayer = players.find(item => item.userId === votedUserId);
                    console.log('votedPlayer', votedPlayer);
                    votedUserName = votedPlayer ? votedPlayer.userName : "알수없는 에러";
                }

                return {
                    voterName: userName,
                    votedUserName
                }

            });
            voteResult.forEach(vr => {
                const resultText = `[${voteRound+1} Round] ${vr.voterName}가 ${vr.votedUserName}를 투표하였습니다.`
                processChannel.send(resultText);
            })
            const count = _.countBy(voteResult, vr => vr.votedUserName);
            //TODO: 투표수 과반시 players에서 삭제하고 투표로 처형했다는 메세지 보내기
            //TODO: 만약 마피아 처형시 게임 종료. 메세지 발송 후 종료.
            //TODO: 만약 abstention 과반 시 아무일도 없다는 메세지.
            //TODO: 마피아의 밤이 찾아오는 로직 구현하기

            console.log('count', count);
            voteRound += 1;
        }
    } else {
        console.log('error: reaction to other');
    }

})

client.login(process.env.DISCORDJS_BOT_TOKEN);