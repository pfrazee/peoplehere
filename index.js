import { exec } from 'child_process'
import fetch from 'node-fetch'

function run() {
  exec('arp -a', function (err, res) {
    if (err) {
      console.log('failed', new Date())
      console.error(err)
      return
    }
    const macs = new Set()
    res.split('\n').forEach(function (line) {
      if (!line.includes('(192.168.')) {
        console.log('skip', line)
        return
      }
      console.log('extract', line)
      const mac = /at\s([\S]+)\s/.exec(line)[1]
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
}
run()
setInterval(run, 1e3 * 60)
