const RaftRunner = require('raft-runner')
const StateMachine = require('./StateMachine')


const createSqlRaftRunner = (options) => {
    const { id, path, port, peers, ipAddress, stateChangeCallback,  raftStateCallback, fileName} = options;
    const raftRunner = new RaftRunner({
        id, 
        path, 
        port, 
        peers, 
        stateHandler: new StateMachine({fileName, stateChangeCallback, raftStateCallback}), 
        ipAddress});
    return raftRunner;
}

module.exports = createSqlRaftRunner

