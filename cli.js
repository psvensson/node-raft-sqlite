
const fs = require('fs');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const RaftRunnerService = require('./src/RaftRunnerService');
const StateMachine = require('./src/StateMachine');

const argv = yargs(hideBin(process.argv)).argv

const arg_path = argv.path || ".raft/data";
const arg_id = argv.id || "id1";
const arg_port = argv.port || 8047;
const arg_peers = argv.peers ? JSON.parse(argv.peers) : undefined
const ipAddress = argv.ip ?  argv.ip : undefined

console.log('peers = ',arg_peers);
console.log('port = '+arg_port);
console.log('id = '+arg_id);

fs.mkdirSync('.db', { recursive: true });

const raftRunnerService = new RaftRunnerService({
    id: arg_id,
    path: arg_path,
    port: arg_port,
    peers: arg_peers,
    ipAddress: ipAddress,
    fileName:'.db/sqlite_'+arg_port+'.db',
    stateChangeCallback: (state) => {
        console.log('--- stateChangeCallback: ', state)
    },
    raftStateCallback: (state) => {
        console.log('--- raftStateCallback: ', state)
    }
})

