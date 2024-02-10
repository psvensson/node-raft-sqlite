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
        const { id, path, port, peers, ipAddress, stateChangeCallback, raftStateCallback, fileName, stateErrorCallback } = options;
       
        this.raftRunner = new RaftRunner({
            id,
            path,
            port,
            peers,
            stateHandler: new StateMachine({ fileName, stateChangeCallback, raftStateCallback, stateErrorCallback }),
            ipAddress
        });
        return this.raftRunner;
    }

    isWriteStatement(query) { return SQL_WRITE_STATEMENTS.some((statement) => query.toUpperCase().startsWith(statement)) }

    // TODO: Clean up this logic. There's lower hanging fuit inside of the getPeers() result.
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
        const peerPort = parseInt(peerRaw[1].split('//')[1].split(':')[1]) + 3
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

    async queryHandler(query) {
        console.log('RaftRunnerService --- queryHandle /query: ', query)
        if (this.isWriteStatement(query)) {
            console.log('RaftRunnerService --- detected WRITE statement')
            if (this.raftRunner.isLeader()) {
                console.log('RaftRunnerService --- I am the leader, so changing stateMachine ')
                this.raftRunner.changeStateMachine(query)
                return 'OK'
            } else {
                console.log('RaftRunnerService --- routing query to leader')
                return this.routeQueryToLeader(query)
            }

        } else {
            return this.executeLocalQuery(req.body.q, res)
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

