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
        const peers = this.raftRunner.getPeers().peers
        console.log('RaftRunnerService --- getIpAddressForPeerId peers == ', peers)
        /* format of peers; [
            [ 'id1', 'tcp://192.168.86.210:8041' ],
            [ 'id2', 'tcp://192.168.86.210:8051' ],
            [ 'id3', 'tcp://192.168.86.210:8061' ]
        ],*/
        
        const peerRaw = peers.find((peer) => peer[0] === peerId)
        // extract ip address from peerRaw string
        const peerAddress = peerRaw[1].split('//')[1].split(':')[0]
        // extract port
        const peerPort = parseInt(peerRaw[1].split('//')[1].split(':')[1])+3
        const peer = [peerId, `http://${peerAddress}:${peerPort}`]
        console.log('RaftRunnerService --- getIpAddressForPeerId peer = ', peer)
        return peer[1]
    }
    

    async routeQueryToLeader(query) {
        console.log('RaftRunnerService --- routeQueryToLeader')
        const leader = this.raftRunner.getLeaderId()
        console.log('RaftRunnerService --- routeQueryToLeader leader = ', leader)
        // Send query to leader
        const leaderUrl = this.getIpAddressForPeerId(leader)
        console.log('RaftRunnerService --- leaderUrl = ', leaderUrl)
        const result = await axios.post(leaderUrl + '/query', { q: query })
        return result
    }

    queryHandler(req, res) {
        console.log('RaftRunnerService --- queryHandle /query: ', req.body)
        if (req.body.q) {
            if (this.isWriteStatement(req.body.q)) {
                console.log('RaftRunnerService --- detected WRITE statement')
                if (this.raftRunner.isLeader()) {
                    console.log('RaftRunnerService --- I am the leader, so changing stateMachine ')
                    this.raftRunner.changeStateMachine(req.body.q)
                    res.send('OK')
                } else {
                    console.log('RaftRunnerService --- routing query to leader')
                    this.routeQueryToLeader(req.body.q).then((res) => {
                        res.send(res)
                    }).catch((err) => {
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
        console.log('RaftRunnerService --- execute local query: ', query)
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

