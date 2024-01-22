
const fs = require('fs');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const RaftRunner = require('raft-runner');
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

const raftRunner = new RaftRunner({
    id: arg_id,
    path: arg_path,
    port: arg_port,
    peers: arg_peers,
    stateHandler: new StateMachine({fileName: '.db/sqlite_db_'+arg_port}),
    ipAddress: ipAddress
});

// create an express http handler for path 'query' which rads the query parameter and calls raftRunner.changeStateMachine(query)

const app = require('express')()    
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.raw());

app.post('/query', (req, res) => {
    console.log('--- handle /query: ', req.body)
    if(req.body.q){
        raftRunner.changeStateMachine({statement:req.body.q})
        res.send('OK')
    } else {
        console.log('no q query param')
        res.send('no q query param')
    }
    
})

app.listen(arg_port+3, () => {
    console.log(`Example app listening on port ${arg_port}`)
  })

