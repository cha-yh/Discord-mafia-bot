function sendAnnouncement(channels, message) {
    channels.map(channel => {
        channel.send(message)
    })
}

module.exports = sendAnnouncement;