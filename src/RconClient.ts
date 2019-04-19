import { Socket } from 'net';

enum CMDTYPE {
  COMMAND = 2,
  AUTH = 3,
  RESPONSE_VALUE = 0,
  RESPONSE_AUTH = 2
}

function createRequest(type:CMDTYPE,id:number,body:string){
  const size = Buffer.byteLength(body) + 14;
  const buffer = new Buffer(size);
  buffer.writeInt32LE(size-4,0);
  buffer.writeInt32LE(id,4);
  buffer.writeInt32LE(type,8);
  buffer.write(body,12,size-2,'ascii')
  buffer.writeInt16LE(0,size-2);
  return buffer;
}

function readResponse(data:Buffer){
  return {
    size: data.readInt32LE(0),
    id: data.readInt32LE(4),
    type: data.readInt32LE(8) as CMDTYPE,
    body: data.toString('ascii',12,data.length-2)
  }
}

export class RconClient {
  private readonly client: Socket;
  private authenticated: boolean;
  private responseListeners: {[key:number]:(()=>void)[]};
  constructor(host:string,port:number){
    this.client = new Socket();
    this.client.connect(port,host)
    this.authenticated = false;
    this.responseListeners = {};
    this.client.on('data',response=>{
      const resp = readResponse(response);
      this.responseListeners[resp.id] = this.responseListeners[resp.id] || []
      this.responseListeners[resp.id].forEach(cb=>(
        cb()
      ))
      delete this.responseListeners[resp.id];
    })
  }
  private addListener(id:number,cb:()=>void){
    this.responseListeners[id] = (this.responseListeners[id]||[]).concat(cb)
  }
  private isAuthenticated(){
    return this.authenticated;
  }
  login(password:string){
    return new Promise((resolve)=>{
      this.addListener(1,()=>{
        this.authenticated = true;
        resolve()
      })
      this.client.write(createRequest(CMDTYPE.AUTH,1,password))
    })
  }
  exec(cmd:string){
    const reqId = Math.ceil(Math.random()*1000);
    if(!this.isAuthenticated()){
      throw new Error('You are not authenticated!');
    }
    return new Promise((resolve)=>{
      this.addListener(reqId,()=>resolve())
      this.client.write(createRequest(CMDTYPE.COMMAND,reqId,cmd))
    })
  }
  subscribe(cb:(resp:any)=>void){
    this.client.on('data',resp=>{
      cb(readResponse(resp))
    })
  }
}
