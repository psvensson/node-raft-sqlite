const assert = require('assert');
const StateMachine = require('../src/StateMachine');

describe('StateMachine', () => {
  it('should be able to create a new state machine', () => {
    const stateMachine = new StateMachine({
      fileName: ':memory:',
      schemas: [
        {
          sql: 'create table users (id integer primary key, name text)',
        },
      ],
    });
    assert.ok(stateMachine);
  });

  it('should be able to handle a query', async () => {
    const stateMachine = new StateMachine({
      fileName: ':memory:',
      schemas: [
        {
          sql: 'create table users (id integer primary key, name text)',
        },
      ],
    });

    const rows = await stateMachine.handle('select * from users');
    assert.ok(rows);
    assert.strictEqual(rows.length, 0);
  });

  it('should be able to handle a snapshot', async () => {
    const stateMachine = new StateMachine({
      fileName: ':memory:',
      schemas: [
        {
          sql: 'create table users (id integer primary key, name text)',
        },
      ],
    });

    const data = [
      {
        dbName: 'users',
        rows: [
          {
            id: 1,
            name: 'John Doe',
          },
        ],
      },
    ];

    await stateMachine.handleSnapshot(JSON.stringify(data));

    const rows = await stateMachine.handle('select * from users');
    assert.ok(rows);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].id, 1);
    assert.strictEqual(rows[0].name, 'John Doe');
  });

  it('should be able to create a snapshot and consume it', async () => {
    const stateMachine1 = new StateMachine({
      fileName: ':memory:',
      schemas: [
        {
          sql: 'create table users (id integer primary key, name text)',
        },
      ],
    });
  
    const stateMachine2 = new StateMachine({
      fileName: ':memory:',
      schemas: [
        {
          sql: 'create table users (id integer primary key, name text)',
        },
      ],
    });
  
    // Populate the first StateMachine with data.
    await stateMachine1.handle('insert into users (id, name) values (1, \'John Doe\')');
  
    // Get a read stream of the data from the first StateMachine.
    const snapshotReadStream = await stateMachine1.createSnapshotReadStream();
  
    // Convert the read stream into an object.
    console.log('** Converting snapShot to object **  length :'+ snapshotReadStream.readableLength)
    const data = await new Promise((resolve, reject) => {
      const chunks = [];
      snapshotReadStream
        .on('data', chunk => {
          console.log('** chunk **')
          console.log(chunk)
          chunks.push(chunk)
        })
        .on('error', reject)
        .on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    
    // Call handleSnapshot on the second StateMachine to make it consume the snapshot.
    await stateMachine2.handleSnapshot(data);
  
    // Verify that the data from the first StateMachine is now inside the other.
    const rows = await stateMachine2.handle('select * from users');
    assert.ok(rows);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].id, 1);
    assert.strictEqual(rows[0].name, 'John Doe');
  });

});

