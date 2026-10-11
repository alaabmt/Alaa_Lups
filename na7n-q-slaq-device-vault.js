// NA7N Q-SLAQ optional same-device encrypted vault.
// No health answers leave this browser. Login is used only to scope records to an
// authenticated NA7N user ID. Not cloud backup, cross-device sync, or a medical EHR.
(function(){
  "use strict";
  const DB="na7n_qslaq_local_v1",TABLE="private_records",ITERATIONS=300000;
  function available(){
    return typeof indexedDB!=="undefined" &&
      typeof crypto!=="undefined" && !!crypto.subtle && !!crypto.getRandomValues;
  }
  function ensure(){
    if(!available())throw new Error("Local encrypted storage is unavailable in this browser.");
  }
  function open(){
    ensure();
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB,1);
      request.onupgradeneeded=()=>{
        const database=request.result;
        if(!database.objectStoreNames.contains(TABLE)){
          const store=database.createObjectStore(TABLE,{keyPath:"id"});
          store.createIndex("user_id","userId",{unique:false});
        }
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(new Error("Unable to open encrypted device vault."));
      request.onblocked=()=>reject(new Error("Device vault update is blocked by another open tab."));
    });
  }
  function b64(bytes){
    let value="";
    for(const byte of bytes)value+=String.fromCharCode(byte);
    return btoa(value);
  }
  function unb64(string){
    const raw=atob(string);
    return Uint8Array.from(raw,letter=>letter.charCodeAt(0));
  }
  async function keyFrom(passphrase,salt){
    const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(passphrase),
      {name:"PBKDF2"},false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:ITERATIONS,hash:"SHA-256"},
      material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  }
  async function save(userId,passphrase,report){
    ensure();
    if(typeof userId!=="string"||!userId||typeof passphrase!=="string"||
       passphrase.length<12)throw new Error("A signed-in account and a 12-character passphrase are required.");
    if(!report||report.tool!=="Q-SLAQ"||report.schema!==1||
       !report.answers||!Number.isInteger(report.scores?.severity)||
       !Number.isInteger(report.scores?.symptoms)||
       !Number.isInteger(report.scores?.global))throw new Error("Invalid Q-SLAQ report.");
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await keyFrom(passphrase,salt);
    const id=crypto.randomUUID?crypto.randomUUID():b64(crypto.getRandomValues(new Uint8Array(20))).replaceAll("/","-");
    const payload=new TextEncoder().encode(JSON.stringify(report));
    const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv,
      additionalData:new TextEncoder().encode(userId+":"+id)},key,payload);
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(TABLE,"readwrite");
      const record={id,userId,salt:b64(salt),iv:b64(iv),
        ciphertext:b64(new Uint8Array(encrypted)),version:1};
      tx.objectStore(TABLE).put(record);
      tx.oncomplete=()=>{db.close();resolve(id)};
      tx.onerror=()=>{db.close();reject(new Error("Unable to save this record."))};
      tx.onabort=()=>{db.close();reject(new Error("Local save was cancelled."))};
    });
  }
  async function listEncrypted(userId){
    ensure();
    if(typeof userId!=="string"||!userId)throw new Error("Sign in first.");
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(TABLE,"readonly");
      const request=tx.objectStore(TABLE).index("user_id").getAll(userId);
      request.onsuccess=()=>{db.close();resolve(request.result||[])};
      request.onerror=()=>{db.close();reject(new Error("Unable to read saved results."))};
    });
  }
  async function load(userId,passphrase){
    if(typeof passphrase!=="string"||passphrase.length<12)throw new Error("Invalid passphrase.");
    const rows=await listEncrypted(userId);
    const decoded=[];
    for(const row of rows){
      try{
        const key=await keyFrom(passphrase,unb64(row.salt));
        const bytes=await crypto.subtle.decrypt({name:"AES-GCM",
          iv:unb64(row.iv),additionalData:new TextEncoder().encode(userId+":"+row.id)},
          key,unb64(row.ciphertext));
        const payload=JSON.parse(new TextDecoder().decode(bytes));
        if(payload.tool!=="Q-SLAQ"||payload.schema!==1)throw new Error("Incorrect record type.");
        decoded.push({id:row.id,...payload});
      }catch{
        throw new Error("The passphrase is incorrect, or a saved record could not be opened.");
      }
    }
    return decoded.sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)));
  }
  async function remove(userId,id){
    const rows=await listEncrypted(userId);
    if(!rows.some(row=>row.id===id))throw new Error("This record does not belong to this account.");
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(TABLE,"readwrite");
      tx.objectStore(TABLE).delete(id);
      tx.oncomplete=()=>{db.close();resolve()};
      tx.onerror=()=>{db.close();reject(new Error("Unable to remove local record."))};
    });
  }
  window.NA7NQslaQVault=Object.freeze({available,save,load,listEncrypted,remove});
})();
