const Readable = require('stream').Readable
// TODO: SWitch to better-sqlite3 !!
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')

// TODO: Change this to use _memory sqlite database instead. The state is alrady in Raft so there's no need to copy it to a file and go slower.
// This means changing handleSnapshot and chreadeSnapshotReadStream since they now need to execute sql statements on the in-memory database.
module.exports = class StateMachine {
    constructor(options) {
        console.log('===== SQL StateMachine constructor ')
        this.fileName = options.fileName || ':memory:'
        this.schemas = options.schemas
        // Derive db names from the sql create if not exists statement in each schema    
        this.dbNames = this.schemas.map(schema => schema.sql.match(/create\s+table\s+(\w+)\s+/)[1])

        this.raftStateCallback = options.raftStateCallback
        this.stateChangedCallback = options.stateChangedCallback
        this.stateErrorCallback = options.stateErrorCallback
        // check if file exists and delete it if it does
        if (fs.existsSync(this.fileName)) {
            console.log('===== SQL StateMachine constructor: file exists, deleting it: ' + this.fileName)
            fs.unlinkSync(this.fileName)
        }
        // Create a new file named this.filename and save data in it
        this.db = new sqlite3.Database(this.fileName);
        // Create dbs of all schemas
        this.db.serialize(() => {
            this.db.run('BEGIN TRANSACTION')
            this.schemas.forEach(schema => {
                const sql = schema.sql
                console.log('===== SQL StateMachine constructor: sql = ' + sql)
                this.db.run(sql, function callback(err) {
                    if (err) {
                        console.log('===== SQL StateMachine constructor: err = ', err)
                    }
                })
            })
            this.db.run('COMMIT')
        })
    }

    raftStateChanged(state) {
        console.log('===== SQL StateMachine --- raftStateChanged: ', state)
        if (this.raftStateCallback) {
            this.raftStateCallback(state)
        }
    }

    handle(query) {
        return new Promise((resolve, reject) => {
            console.log("+++++ SQL StateMachine handle: " + query);
            this.db.all(query, function callback(err, rows) {
                if (err) {
                    console.log('+++++ SQL StateMachine handle: err = ', err)
                    if (this.stateErrorCallback) {
                        this.stateErrorCallback(query, err)
                    }
                    reject(err)
                } else {
                    console.log('+++++ SQL StateMachine handle: success; ', this)
                    console.dir(rows)
                    if (this.stateChangedCallback) {
                        this.stateChangedCallback(query, rows)
                    }
                    resolve(rows)
                }
            })
        })
    }

    // The snapshot will be rows from a select Ä from dbName operation
    async handleSnapshot(dataString) {
        const data = JSON.parse(dataString) 
        console.log("=====> SQL StateMachine handleSnapshot: ");
        console.dir(data)
        return new Promise((resolve, reject) => {
            // The snapshot contains the  data rows crated in the createSnapshotReadStream, from the table, now upsert all the data into the table
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION')
                data.forEach(dbObj => {
                    const dbName = dbObj.dbName
                    const rows = dbObj.rows
                    console.log('===== SQL StateMachine handleSnapshot: dbName = ' + dbName)
                    rows.forEach(row => {
                        console.log('===== SQL StateMachine handleSnapshot: row = ', row)
                       
                        const keys = Object.keys(row)
                        const values = Object.values(row)
                        // Use the upsert sqlite functionality (insert with on conflict) so that rows are updated if they exists, otherwise a new row is created
                        const sql = 'INSERT INTO ' + dbName + ' (' + keys.join(',') + ') VALUES (' + keys.map(() => '?')
                            .join(',') + ') ON CONFLICT DO UPDATE SET ' + keys.map(key => key + '=excluded.' + key).join(',')
                        console.log('===== SQL StateMachine handleSnapshot: sql statement is: ' + sql)
                        this.db.run(sql, values, function callback(err) {
                            if (err) {
                                console.log('===== SQL StateMachine handleSnapshot: err = ', err)
                                reject(err)
                            } else {
                                console.log('===== SQL StateMachine handleSnapshot: success; lastID ', this.lastID, 'changes: ', this.changes)
                                resolve(this.changes)
                            }
                        })
                    })
                })
                this.db.run('COMMIT TRANSACTION')
            })
        })
    }

    asyncQuery(sql) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, function callback(err, rows) {
                if (err) {
                    console.log('===== SQL StateMachine handle: err = ', err)
                    reject(err)
                } else {
                    console.log('===== SQL StateMachine handle: success; ')
                    resolve(rows)
                }
            })
        })
    }

    // A version of createSnapshotReadstream which instead of pushing each rrow on one db, insteac pushes all the rows for each db this.dbNames
    async createSnapshotReadStream() {
        console.log("------ SQL StateMachine createSnapshotReadStream ");
        return new Promise(async (resolve, reject) => {
            const dbNames = this.dbNames
            const srows = []

            dbNames.forEach((dbName, index) => {
                console.log('------ SQL StateMachine createSnapshotReadStream: dbName = ' + dbName)
                // Select * from the dbname and push the rows to the stream
                this.asyncQuery('select * from ' + dbName).then((rows) => {
                    console.log('------ SQL StateMachine createSnapshotReadStream: success; ', this)
                    console.dir(rows)
                    console.log('index: ' + index + ', dbnames.length: ' + dbNames.length)
                    srows.push({ dbName: dbName, rows: rows })
                    if (index === dbNames.length - 1) {
                        console.log('resolving readStream with rows now being: ', rows)
                        resolve(readStream)
                    }
                })
            })

            const readStream = new Readable({
                read() {
                    console.log("------ SQL StateMachine createSnapshotReadStream: read ");
                    this.push('[')
                    srows.forEach(row => {
                        console.log('readStrad.read pushing row: ', row)
                        this.push(JSON.stringify(row))
                    })
                    this.push(']')
                    this.push(null)
                }
            })
        })
    }
}