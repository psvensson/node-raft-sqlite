const Readable = require('stream').Readable
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')

module.exports = class StateMachine {
    constructor(options) {
        this.fileName = options.fileName
        this.raftStateCallback = options.raftStateCallback
        this.stateChangedCallback = options.stateChangedCallback
        this.db = new sqlite3.Database(this.fileName);
    }

    raftStateChanged(state){
        console.log('SQL StateMachine --- raftStateChanged: ', state)
        if(this.raftStateCallback){
            this.raftStateCallback(state)
        }
    }

    handle(q) {
        const query = JSON.parse(q)
        console.log("SQL StateMachine handle: " + query+' typof = '+typeof query);
        console.dir(query)
        if(query.statement && query.statement.length) {
            console.log("SQL StateMachine runs query...");
            this.db.all(query.statement, function callback(err, rows){
                if(err){
                    console.log('SQL StateMachine handle: err = ', err)
                } else {
                    console.log('SQL StateMachine handle: success; ', this)
                    console.dir(rows)
                }
            })
        } else {
            console.log("SQL StateMachine handle: no statement in query");
        }
        if(this.stateChangedCallback){
            this.stateChangedCallback(query)
        }
    }

    handleSnapshot(data) {
        console.log("SQL StateMachine handleSnapshot: " + data);
        // Stop the existing db, remove the old file with name this.filename and save data in a new file with the same name, then recreate database with this.filename as in the constructor
        this.db.close()
        this.db = null
        // Remove old file named this.filename        
        fs.unlinkSync(this.filename)
        // Create a new file named this.filename and write data to it
        fs.writeFileSync(this.filename, data)
        // Recreate database with this.filename as in the constructor
        this.db = new sqlite3.Database(this.fileName);
    }

    // createSnapshotReadStream() should return an object implementing the stream.readStream protocol that will produce the snapshot's content.
    createSnapshotReadStream() {
        const readStream = new Readable({
            read() {
                // Read the contents of this.filename and push it to the stream
                const data = fs.readFileSync(this.fileName);
                this.push(data);
                this.push(null);
            }
        })
        return readStream
    }

}