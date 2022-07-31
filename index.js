import { exec } from 'child_process'
import fetch from 'node-fetch'

const skip_mac_prefixes = [
  // iot devices
  '6c:29:90',
  'a8:bb:50:',
  // not sure but probably not a person
  'ff:ff:ff:ff:ff:ff',
  // nest
  '64:16:66',
  // amazon
  '90:A8:22',
  'EC:0D:E4',
  'ec:d:e4',
  '18:B4:30',
  '10:ce:02',
  '10:ce:2',
  // nokia (?)
  'DC:8D:8A',
  // sonos
  '78:28:CA',

  // controversial choices from here
  // I believe that mobile phones use randomized mac addresses
  // so if a lookup returns anything, I'm assuming it's not a phone
  
  // apple
  'c8:d0:83',
  '38:f9:d3',
  // google
  '44:BB:3B',
  '28:BD:89',
].map(v => v.toLowerCase())

function portscan (cb) {
  // we do this to hydrate the arp results
  console.log('triggering port scan')
  exec('nmap -sn \'192.168.1.*\'', function (err,  res) {
    if (err) {
      console.log('failed', new Date())
      console.error(err)
      return
    }
    cb()
  })
}

function run() {
  portscan(function() {
  exec('arp -a', function (err, res) {
    if (err) {
      console.log('failed', new Date())
      console.error(err)
      return
    }
    const macs = new Set()
    res.split('\n').forEach(function (line) {
      if (!line.includes('(192.168.') || line.includes('incomplete')) {
        return
      }
      console.log('extract', line)
      const mac = /at\s([\S]+)\s/.exec(line)[1]
      for (const skipprefix of skip_mac_prefixes) {
        if (mac.startsWith(skipprefix)) {
          console.log('-- known prefix to skip')
          return
        }
      }
      macs.add(mac)
    })
    console.log(macs.size, macs)
    fetch(process.env.ENDPOINT + `?num=${macs.size}`, { method: 'POST' }).then(
      (res) => {
        console.log('succeeded', new Date())
      },
      (err) => {
        console.log('failed', new Date())
        console.error(err)
      }
    )
  })
  })
}
run()
setInterval(run, 1e3 * 60)
