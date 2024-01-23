# node-raft-sqlite
A small service leveraging raft-runner (node-zmq-raft) and sqlite for a node.js centric raft-replicated sqlite db, similar in spirit to rqlite but with way less capabilities or scope.

## Overview

The start[123].sh files starts up trhee replicas of a raft cluster on localhost, where each replica has its own ports assigned and its own db file.

The shell scipt uses the cli.js program to start everything, which is an example of how to make use of this package. The easiest way to try this out is to start four shells and start each of the start script in the first three of them. Then modify the test.sh script so it start with sending sql.txt to the test express handle of the first service, then sql2.tx and lastly sql3.txt

The first two creates a small db and inserts a row of data - these two will be trreated as raft state to be changed (according to cli.js) and will be replicated.

The third file sql3.txt contains a select statement, which will be applied to the local instance only.

Do not use this even remotely near production. It is way-way before alpha version and it will erase eberything on your hard disks and swear ut of the wrong end of your cats. Beware.

TODO: 

- Ensure that any write operation only takes place on the leader, to ensure serialization of satte changes
- Refactor cli.js to move useful stuff into service.js instead
