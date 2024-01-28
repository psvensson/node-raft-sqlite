const Readable = require('stream').Readable
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')

module.exports = class StateMachine {
    constructor(options) {
        console.log('===== SQL StateMachine constructor ')
        this.fileName = options.fileName
        this.raftStateCallback = options.raftStateCallback
        this.stateChangedCallback = options.stateChangedCallback
        this.stateErrorCallback = options.stateErrorCallback
        // check if file exists and delete it if it does
        if (fs.existsSync(this.fileName)) {
            console.log('===== SQL StateMachine constructor: file exists, deleting it: '+this.fileName  )
            fs.unlinkSync(this.fileName)
        }
        // Create a new file named this.filename and save data in it
        this.db = new sqlite3.Database(this.fileName);
    }

    raftStateChanged(state){
        console.log('===== SQL StateMachine --- raftStateChanged: ', state)
        if(this.raftStateCallback){
            this.raftStateCallback(state)
        }
    }

    handle(query) {        
        return new Promise((resolve, reject) => {
            console.log("===== SQL StateMachine handle: " + query);
            this.db.all(query, function callback(err, rows){
                if(err){
                    console.log('===== SQL StateMachine handle: err = ', err)
                    if(this.stateErrorCallback){
                        this.stateErrorCallback(query, err)
                    }
                    reject(err)
                } else {
                    console.log('===== SQL StateMachine handle: success; ', this)
                    console.dir(rows)
                    if(this.stateChangedCallback){
                        this.stateChangedCallback(query, rows)
                    }
                    resolve(rows)
                }
            })
        })
    }

    handleSnapshot(data) {
        console.log("===== SQL StateMachine handleSnapshot: " + data);
        // Stop the existing db, remove the old file with name this.filename and save data in a new file with the same name, then recreate database with this.filename as in the constructor
        this.db.close()
        this.db = null
        // Remove old file named this.filename        
        //fs.unlinkSync(this.fileName)
        // Create a new file named this.filename and write data to it
        //console.dir(data)
        //fs.writeFileSync(this.fileName, data)
        // Recreate database with this.filename as in the constructor
        data.replace(this.fileName)
        this.db = new sqlite3.Database(this.fileName);
    }

    // createSnapshotReadStream() should return an object implementing the stream.readStream protocol that will produce the snapshot's content.
    createSnapshotReadStream() {
        console.log("===== SQL StateMachine createSnapshotReadStream " );
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