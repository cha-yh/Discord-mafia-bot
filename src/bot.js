require('dotenv').config();

const Discord = require('discord.js');

const client = new Discord.Client();

const PREFIX = "$";

let isCreated = false;
let joinedUsers = [];

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

            //NOTE : make roles
            for(let i = 0; i < args[0]-1; i++) {
                msg.guild.roles.create({
                    data: {
                        name: `role[${i}]`,
                        position: 1,
                        color: 'GOLD',
                        permissions: ['MANAGE_ROLES']
                    }
                }).then(d => {console.log('d', d)});
            }
        }

        if(CMD_NAME === 'join') {
            const authorId = msg.author.id;
            const index = joinedUsers.findIndex(userId => userId === authorId);
            console.log('index', index);
            const member = msg.guild.members.cache.get(authorId);
            if(index === -1) {
                joinedUsers.push(authorId);
                msg.channel.send(`${member.user.username}님이 참여하였습니다.`);
            } else {
                msg.channel.send(`${member.user.username}님은 이미 참여한 상태입니다.`);
            }
        }

        if(CMD_NAME === 'status') {
            const joinedUserCount = joinedUsers.length;
        
            msg.channel.send(`Joined user count: ${joinedUserCount}`);
            let joinedUserNames = [];
            joinedUsers.length
                ? 
                joinedUsers.forEach(userId => {
                    const member = msg.guild.members.cache.get(userId);
                    joinedUserNames.push(member.user.username);
                })
                
                : msg.channel.send('아무도 참여하지 않은 상태입니다.');
        
            joinedUserNames.length && msg.channel.send(`참여한 멤버: ${joinedUserNames.join(', ')}`);
        }

        if(CMD_NAME === 'end') {
            //NOTE : initiate vars
            joinedUsers = [];
            isCreated = false;

            //TODO : find roles that contain 'role' and delete roles
            const role = msg.guild.roles.cache.find(role => role.name == 'role[0]');
            role.delete();
        }
    }
  });

client.login(process.env.DISCORDJS_BOT_TOKEN);