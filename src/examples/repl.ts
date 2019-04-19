// REPL-CLI using RconClient
// Usage:
// npx ts-node src/examples/repl

// Create a factorio server in docker to test against
// mkdir -p /tmp/factoriorcon && echo password > /tmp/factoriorcon/rconpw
// docker run --rm --name=factorio -p 27015:27015 -v /tmp/factoriorcon:/factorio/config dtandersen/factorio:0.17.32
import { Interface, createInterface } from 'readline';
import { RconClient } from '../RconClient';
const port = 27015;
const host = 'localhost';

const rconPassword = 'password';

const client = new RconClient(host,port);

client.login(rconPassword).then(()=>{
  startRepl(client)
})

function startRepl(c:RconClient){
  const i = createInterface({
    input: process.stdin,
    output: process.stdout
  })

  repl(i,c)
  c.subscribe(resp=>{
    console.log(resp.body)
  })

}

function repl(i:Interface,c:RconClient){
  i.question('$ ',input=>
    c.exec(input).then(()=>repl(i,c))
  )
}
