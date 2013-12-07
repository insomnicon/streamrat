# Streamrat Bandwidth Monitor

This client/server NodeJS pair monitors the bandwidth usage of various stream
servers and reports it back to a master which can do load balancing basd on
that information.

## Usage

### Server

The server can be configured on a particular port:

    bin/server [--port=1080]

It exposes several urls:

 * `/state` exports the current state of the server.
 * `/stream/:stream` when called with `GET` will redirect to a random
   non-overloaded server. It's biased towards the less loaded servers.
 * `/stream/:stream/active` returns a list of active servers.
 * `/update` is called by the agents to deliver updated data.

### Client

The agent process works on most Linux installations, provided they have
`/proc/net/dev` and `/proc/net/ipv4` in the usual format.

Starting the agent is simple:

    bin/agent ----stream=http://stream.url/ --report=http://master.server/update [--limit=100]

The `--stream` option specifies which stream URL to advertise. The `--report`
option tells it where to send the data. An optional limit can be sent
that defines the upper limit in terms of Mbit/s.

Either every stream will have to be identified specifically, or the URL
can be presumed to be the base and have other things appended to it
as required. The only requirement is it should be a valid URL since
it's sent back in a `Location:` header via HTTP.

