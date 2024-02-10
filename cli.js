
const fs = require('fs');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const RaftRunnerService = require('./src/RaftRunnerService');


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

function createExpressHandler() {
    this.app = require('express')()
    const bodyParser = require('body-parser');

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.raw());

    this.app.post('/query', (req, res) => {
        const query = req.body.q
        if (query) {
            raftRunnerService.queryHandler(query).then((result) => {
                res.send(result)
            }).catch((err) => {
                res.send(err)
            })
        } else {
            console.log('no q query param')
            res.send('no q query param')
        }
    })

    const port = arg_port + 3
    this.app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}

createExpressHandler()

