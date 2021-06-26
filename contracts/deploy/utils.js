module.exports.getQueueAddress = async (receipt, abi) => {
    if (!receipt || !receipt.logs) return "";
    const iface = new ethers.utils.Interface(abi);
    const eventFragment = iface.events[Object.keys(iface.events)[0]];
    const eventTopic = iface.getEventTopic(eventFragment);
    const event = receipt.logs.find(e => e.topics[0] === eventTopic);
    if (event) {
        const decodedLog = iface.decodeEventLog(
        eventFragment,
        event.data,
        event.topics,
        );
        return decodedLog.queueAddress;
    }
    return "";
};