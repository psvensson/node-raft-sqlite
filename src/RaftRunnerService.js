const axios = require('axios');

const RaftRunner = require('raft-runner')
const StateMachine = require('./StateMachine')

const SQL_WRITE_STATEMENTS = ['ALTER', 'CREATE', 'DELETE', 'DROP', 'INSERT', 'UPDATE']

class RaftRunnerService {
    constructor(options) {
        console.log('-----------------------------------')
        console.log('-----------------------------------')
        console.log('--- raftRunnerService constructor: ', options)
        console.log('-----------------------------------')
        console.log('-----------------------------------')
        const { id, path, port, peers, ipAddress, stateChangeCallback, raftStateCallback, fileName } = options;
        this.port = port;
        this.raftRunner = new RaftRunner({
            id,
            path,
            port,
            peers,
            stateHandler: new StateMachine({ fileName, stateChangeCallback, raftStateCallback }),
            ipAddress
        });
        this.createExpressHandler()
        return this.raftRunner;        
    }

    createExpressHandler() {
        this.app = require('express')()
        const bodyParser = require('body-parser');

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.raw());

        this.app.post('/query', this.queryHandler.bind(this))

        const port = this.port + 3
        this.app.listen(port, () => {
            console.log(`Example app listening on port ${port}`)
        })
    }

    isWriteStatement(query) { return SQL_WRITE_STATEMENTS.some((statement) => query.toUpperCase().startsWith(statement)) }

    getIpAddressForPeerId(peerId) {
        return this.raftRunner.peers.find(peer => peer.id === peerId).url
    }

    async routeQueryToLeader(query) {
        const leader = await this.raftRunner.getLeader()
        console.log('--- routeQueryToLeader leader = ', leader)
        // Send query to leader
        const leaderUrl = this.getIpAddressForPeerId(leader)
        console.log('leaderUrl = ', leaderUrl)
        const result = await axios.post(leaderUrl + '/query', { q: query })
        return result
    }

    queryHandler(req, res) {
        console.log('--- queryHandle /query: ', req.body)
        if (req.body.q) {
            if (this.isWriteStatement(req.body.q)) {
                if(this.raftRunner.isLeader){
                    this.raftRunner.changeStateMachine(req.body.q)
                    res.send('OK')
                } else {
                    this.routeQueryToLeader(req.body.q).then((res)=>{
                        res.send(res)
                    }).catch((err)=>{
                        res.send(err)
                    })
                }
                
                
            } else {
                this.executeLocalQuery(req.body.q, res)
            }
        } else {
            console.log('no q query param')
            res.send('no q query param')
        }
    }

    executeLocalQuery(query, res) {
        console.log('--- execute local query: ', query)
        this.raftRunner.stateHandler.handle(query).then((rows) => {
            console.log('rows = ', rows)
            res.send(rows)
        }).catch((err) => {
            console.log('err = ', err)
            res.send(err)
        })
    }
}


module.exports = RaftRunnerService

