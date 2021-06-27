const moment = require('moment');

function formatMessage (username,msg) {
    return {
        username,
        msg,
        time: moment().format('h:mm')
    }
}

module.exports=formatMessage;