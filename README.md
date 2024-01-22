# node-raft-sqlite
A small service leveraging raft-runner (node-zmq-raft) and sqlite for a node.js centric raft-replicated sqlite db, similar in spirit to rqlite but with way less capabilities or scope.

## Overview

The start[123].sh files starts up trhee replicas of a raft cluster on localhost, where each replica has its own ports assigned and its own db file.

The shell scipt uses the cli.js program to start everything, which is an example of how to make use of this package.

Do not use this even remotely near production. It is way-way before alpha version and it will erase eberything on your hard disks and swear ut of the wrong end of your cats. Beware.
