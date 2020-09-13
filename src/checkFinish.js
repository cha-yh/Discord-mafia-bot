const _ = require('lodash');

const MAFIA_HEAD_COUND = 1;
function checkFinish(players, mafiaId) {
    if(!_.some(players, p => p.userId === mafiaId)) {
        return 'MAFIA_LOSE';
    } else {
        if(_.some(players, p => p.userId === mafiaId) && players.length < 2) { //NOTE: 마피아 승리조건
            return 'MAFIA_WIN';
        } else {
            return 'NOT_FINISHED'
        }
    }
}

module.exports = checkFinish;