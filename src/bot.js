require('dotenv').config();
const Discord = require('discord.js');

const client = new Discord.Client();

const PREFIX = "$";

let isCreated = false;
let joinedUserIds = [];
let createdChannelIds = [];
let createdRoleIds = [];
let mafiaId;

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
            console.log('index', index);
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
            //NOTE: create channels
            joinedUserIds.forEach(userId => {
                const member = msg.guild.members.cache.get(userId);
                msg.guild.channels.create(`${member.user.username}`, {
                    permissionOverwrites: joinedUserIds.map(innerUserId => {
                        if(innerUserId === userId) {
                            return {
                                id: innerUserId
                            }
                        }
                        return {
                            id: innerUserId,
                            deny: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        }
                    }),

                }).then(channel => {
                    createdChannelIds.push(channel.id);
                    channel.send('이 채널은 당신에게만 보이는 채널입니다.');
                    userId === mafiaId && channel.send('당신은 마피아입니다. 밤이되면 죽이고 싶은 사람에게 송장 역할을 부여하세요.');
                })
            })

            //NOTE: random mafia
            const randomIndex = Math.floor(Math.random() * joinedUserIds.length);
            mafiaId = joinedUserIds[randomIndex];
            const mafia = msg.guild.members.cache.get(mafiaId);
            console.log('mafia name: ', mafia.user.username);

            //NOTE : make roles
            //FIXME : fix position issue
            msg.guild.roles.create({
                data: {
                    name: '송장',
                    position: joinedUserIds.length+1,
                    color: 'DARK_GREY',
                    permissions: []
                }
            }).then(role => {
                createdRoleIds.push(role.id);
            })
            
            joinedUserIds.forEach(userId => {
                msg.guild.roles.create({
                    data: {
                        name: `role[${userId}]`,
                        position: userId === mafiaId ? joinedUserIds.length : 1,
                        color: 'GOLD',
                        permissions: userId === mafiaId ? ['MANAGE_ROLES'] : []
                    }
                }).then(role => {
                    createdRoleIds.push(role.id);
                    const member = msg.guild.members.cache.get(userId);
                    member.roles.add(role.id);
                });
            })
            
        }

        if(CMD_NAME === 'end') {
            //NOTE : initiate vars
            joinedUserIds = [];
            isCreated = false;

            //NOTE: delete created channels
            createdChannelIds.forEach(id => {
                msg.guild.channels.cache.get(id).delete();
            })
            
            //NOTE: delete created roles
            createdRoleIds.forEach(id => {
                msg.guild.roles.cache.get(id).delete();
            })
            
        }
    }
  });

client.login(process.env.DISCORDJS_BOT_TOKEN);